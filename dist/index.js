import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

createRequire(import.meta.url);
var pathKey = (p) => p.normalize("NFC").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\.md$/i, "").replace(/\s/g, "-").toLowerCase();
var FENCED_CODE = /^([`~]{3,})[^\n]*\n[\s\S]*?^\1[`~]*[ \t]*$/gm;
var WIKILINK = /\[\[([^[\]|#\n]*)(?:#[^[\]|\n]*)?(?:\|[^[\]\n]*)?\]\]/g;
var MARKDOWN_LINK = /\]\(\s*(?:<([^>\n]*)>|([^()\s]+(?:\([^()\s]*\)[^()\s]*)*))/g;
var HTML_ATTRIBUTE = /\b(?:src|href|data|poster)\s*=\s*(?:"([^"\n]*)"|'([^'\n]*)')/gi;
var URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
var decode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
function extractLinkTargets(markdown) {
  const text = markdown.replace(FENCED_CODE, "");
  const targets = [];
  for (const match of text.matchAll(WIKILINK)) {
    const target = (match[1] ?? "").trim().replace(/\\+$/, "");
    if (target) targets.push(target);
  }
  const addUrl = (value) => {
    const raw = (value ?? "").trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("//") || URL_SCHEME.test(raw)) return;
    const target = decode((raw.split("#")[0] ?? "").split("?")[0] ?? "");
    if (target) targets.push(target);
  };
  for (const match of text.matchAll(MARKDOWN_LINK)) addUrl(match[1] ?? match[2]);
  for (const match of text.matchAll(HTML_ATTRIBUTE)) addUrl(match[1] ?? match[2]);
  return targets;
}
function extractCanvasTargets(json) {
  const targets = [];
  try {
    const nodes = JSON.parse(json).nodes;
    if (!Array.isArray(nodes)) return targets;
    for (const node of nodes) {
      if (typeof node.file === "string") targets.push("/" + node.file);
      if (typeof node.text === "string") targets.push(...extractLinkTargets(node.text));
    }
  } catch {
  }
  return targets;
}
function buildLinkIndex(files) {
  const index = /* @__PURE__ */ new Map();
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
function resolveTarget(index, fromFile, target) {
  const link = target.replace(/\\/g, "/");
  const exact = (key) => (index.get(key) ?? []).filter((file) => pathKey(file) === key);
  if (link.startsWith("/")) return exact(pathKey(link));
  const fromDir = path.posix.dirname(fromFile.replace(/\\/g, "/"));
  const relative = exact(pathKey(path.posix.normalize(path.posix.join(fromDir, link))));
  if (link.startsWith("./") || link.startsWith("../")) return relative;
  return [.../* @__PURE__ */ new Set([...index.get(pathKey(link)) ?? [], ...relative])];
}
var isLinkSource = (file) => /\.(md|canvas)$/i.test(file);
function reachableCandidates(files, isCandidate, read) {
  const index = buildLinkIndex(files.filter(isCandidate));
  const reachable = /* @__PURE__ */ new Set();
  const queue = files.filter((file) => !isCandidate(file) && isLinkSource(file));
  for (let file = queue.pop(); file !== void 0; file = queue.pop()) {
    const text = read(file);
    if (text === void 0) continue;
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

// src/index.ts
var RemoveUnlinkedNotes = (opts) => {
  const folders = (opts?.folders ?? []).map(pathKey).filter((folder) => folder.length > 0);
  const inFolder = (file) => {
    const key = pathKey(file);
    return folders.some((folder) => key.startsWith(folder + "/"));
  };
  let cache;
  const linkedFiles = (ctx) => {
    if (cache?.buildId === ctx.buildId) return cache.linked;
    const reachable = reachableCandidates(ctx.allFiles ?? [], inFolder, (file) => {
      try {
        return fs.readFileSync(path.join(ctx.argv.directory, file), "utf8");
      } catch {
        return void 0;
      }
    });
    cache = { buildId: ctx.buildId, linked: new Set([...reachable].map(pathKey)) };
    return cache.linked;
  };
  return {
    name: "RemoveUnlinkedNotes",
    shouldPublish(ctx, [, file]) {
      const location = file.data.relativePath ?? file.data.slug;
      if (!location || !inFolder(location)) return true;
      if (linkedFiles(ctx).has(pathKey(location))) return true;
      const referencedBy = file.data.referencedBy ?? [];
      return referencedBy.some((slug) => slug !== file.data.slug);
    }
  };
};
var src_default = RemoveUnlinkedNotes;

export { RemoveUnlinkedNotes, src_default as default };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map