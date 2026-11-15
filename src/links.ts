import path from "node:path";

/**
 * Comparison key of a vault-relative path: posix separators, NFC, lower-case, whitespace as "-",
 * no leading/trailing slash and no ".md". Applied to files and link targets alike, so Obsidian's
 * case-insensitive links and Quartz's slugified paths ("My Note" / "My-Note") compare equal.
 */
export const pathKey = (p: string): string =>
  p
    .normalize("NFC")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.md$/i, "")
    .replace(/\s/g, "-")
    .toLowerCase();

const FENCED_CODE = /^([`~]{3,})[^\n]*\n[\s\S]*?^\1[`~]*[ \t]*$/gm;
// [[target]], [[target#heading]], [[target|alias]], ![[embed]]
const WIKILINK = /\[\[([^[\]|#\n]*)(?:#[^[\]|\n]*)?(?:\|[^[\]\n]*)?\]\]/g;
// [text](target), [text](<target with spaces>), ![alt](target "title")
const MARKDOWN_LINK = /\]\(\s*(?:<([^>\n]*)>|([^()\s]+(?:\([^()\s]*\)[^()\s]*)*))/g;
// raw HTML in a note: <img src="…">, <a href="…">, <object data="…">, …
const HTML_ATTRIBUTE = /\b(?:src|href|data|poster)\s*=\s*(?:"([^"\n]*)"|'([^'\n]*)')/gi;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Targets of the internal links and embeds in a Markdown source (wikilinks and Markdown links,
 * frontmatter included), without anchors. Fenced code blocks are skipped.
 */
export function extractLinkTargets(markdown: string): string[] {
  const text = markdown.replace(FENCED_CODE, "");
  const targets: string[] = [];

  for (const match of text.matchAll(WIKILINK)) {
    // "[[note\|alias]]" (pipe escaped inside a table) leaves a trailing backslash
    const target = (match[1] ?? "").trim().replace(/\\+$/, "");
    if (target) targets.push(target);
  }

  const addUrl = (value: string | undefined) => {
    const raw = (value ?? "").trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("//") || URL_SCHEME.test(raw)) return;
    const target = decode((raw.split("#")[0] ?? "").split("?")[0] ?? "");
    if (target) targets.push(target);
  };
  for (const match of text.matchAll(MARKDOWN_LINK)) addUrl(match[1] ?? match[2]);
  for (const match of text.matchAll(HTML_ATTRIBUTE)) addUrl(match[1] ?? match[2]);

  return targets;
}

/** Link targets of an Obsidian `.canvas` file: its file cards and the links in its text cards. */
export function extractCanvasTargets(json: string): string[] {
  const targets: string[] = [];
  try {
    const nodes = (JSON.parse(json) as { nodes?: unknown }).nodes;
    if (!Array.isArray(nodes)) return targets;
    for (const node of nodes as { file?: unknown; text?: unknown }[]) {
      // a file card names its file by vault path
      if (typeof node.file === "string") targets.push("/" + node.file);
      if (typeof node.text === "string") targets.push(...extractLinkTargets(node.text));
    }
  } catch {
    // not valid JSON: no links
  }
  return targets;
}

/** Every path suffix of a file ("a/b/c", "b/c", "c"), as keys → the files that end in it. */
export type LinkIndex = Map<string, string[]>;

export function buildLinkIndex(files: string[]): LinkIndex {
  const index: LinkIndex = new Map();
  for (const file of files) {
    const segments = pathKey(file).split("/");
    for (let i = 0; i < segments.length; i++) {
      const suffix = segments.slice(i).join("/");
      const entry = index.get(suffix);
      if (entry) entry.push(file);
      else index.set(suffix, [file]);
    }
  }
  return index;
}

/**
 * The indexed files a link in `fromFile` may point at. A link is matched as a vault path, as a
 * path relative to the linking file, and (Obsidian's "shortest path") as a file name or partial
 * path anywhere in the vault. An ambiguous link matches every file it could mean.
 */
export function resolveTarget(index: LinkIndex, fromFile: string, target: string): string[] {
  const link = target.replace(/\\/g, "/");
  const exact = (key: string) => (index.get(key) ?? []).filter((file) => pathKey(file) === key);

  if (link.startsWith("/")) return exact(pathKey(link));

  const fromDir = path.posix.dirname(fromFile.replace(/\\/g, "/"));
  const relative = exact(pathKey(path.posix.normalize(path.posix.join(fromDir, link))));
  if (link.startsWith("./") || link.startsWith("../")) return relative;

  return [...new Set([...(index.get(pathKey(link)) ?? []), ...relative])];
}

const isLinkSource = (file: string): boolean => /\.(md|canvas)$/i.test(file);

/**
 * The candidate files that are linked — directly, or through other linked candidates — from a
 * file that is not a candidate. A candidate that only other unlinked candidates link to is not
 * reachable.
 *
 * @param files every file of the vault (vault-relative paths)
 * @param isCandidate whether a file is only published when something links to it
 * @param read the text of a file, or `undefined` if it can't be read
 */
export function reachableCandidates(
  files: string[],
  isCandidate: (file: string) => boolean,
  read: (file: string) => string | undefined,
): Set<string> {
  const index = buildLinkIndex(files.filter(isCandidate));
  const reachable = new Set<string>();
  const queue = files.filter((file) => !isCandidate(file) && isLinkSource(file));

  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    const text = read(file);
    if (text === undefined) continue;
    const targets = /\.canvas$/i.test(file) ? extractCanvasTargets(text) : extractLinkTargets(text);
    for (const target of targets) {
      for (const linked of resolveTarget(index, file, target)) {
        if (reachable.has(linked)) continue;
        reachable.add(linked);
        if (isLinkSource(linked)) queue.push(linked);
      }
    }
  }

  return reachable;
}
