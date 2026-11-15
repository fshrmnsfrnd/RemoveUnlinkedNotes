import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { VFile } from "vfile";
import type { BuildCtx, FilePath, FullSlug } from "@quartz-community/types";
import { RemoveUnlinkedNotes } from "../src/index";
import { extractCanvasTargets, extractLinkTargets, reachableCandidates } from "../src/links";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A vault on disk; `ignored` files exist but are left out of `allFiles`, as Quartz does. */
function vault(files: Record<string, string>, ignored: string[] = []): BuildCtx {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "remove-unlinked-"));
  dirs.push(dir);
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  const allFiles = Object.keys(files).filter(
    (file) => !ignored.some((folder) => file.startsWith(folder + "/")),
  ) as FilePath[];
  return {
    buildId: "build-" + dir,
    argv: { directory: dir },
    allFiles,
  } as unknown as BuildCtx;
}

function page(relativePath: string, data: Record<string, unknown> = {}) {
  const file = new VFile("");
  file.data.relativePath = relativePath as FilePath;
  file.data.slug = relativePath.replace(/\.md$/, "").replace(/ /g, "-") as FullSlug;
  Object.assign(file.data, data);
  return [{ type: "root", children: [] }, file] as never;
}

describe("extractLinkTargets", () => {
  it("finds wikilinks, embeds, Markdown links and raw HTML", () => {
    const md = [
      "---",
      'cover: "[[Cover.png]]"',
      "---",
      "[[Note]] [[Other#Heading|alias]] ![[pic.png|200]] [[Table\\|alias]]",
      '[text](My%20Doc.pdf) ![alt](<folder/with space.png> "title") [anchor](#local)',
      "[web](https://example.com) [mail](mailto:a@b.c)",
      '<img src="raw.png"> <a href="../up/file.pdf">x</a>',
      "```",
      "[[InCode]]",
      "```",
    ].join("\n");

    expect(extractLinkTargets(md)).toEqual([
      "Cover.png",
      "Note",
      "Other",
      "pic.png",
      "Table",
      "My Doc.pdf",
      "folder/with space.png",
      "raw.png",
      "../up/file.pdf",
    ]);
  });

  it("finds canvas file cards and links in text cards", () => {
    const canvas = JSON.stringify({
      nodes: [
        { type: "file", file: "src/board.png" },
        { type: "text", text: "see [[Note]]" },
      ],
    });
    expect(extractCanvasTargets(canvas)).toEqual(["/src/board.png", "Note"]);
    expect(extractCanvasTargets("not json")).toEqual([]);
  });
});

describe("reachableCandidates", () => {
  const isCandidate = (file: string) => file.startsWith("src/");

  it("follows links through linked candidates only", () => {
    const files: Record<string, string> = {
      "index.md": "[[a]]",
      "src/a.md": "[[b]]",
      "src/b.md": "",
      "src/c.md": "[[d]]",
      "src/d.md": "",
    };
    const result = reachableCandidates(Object.keys(files), isCandidate, (f) => files[f]);
    expect([...result].sort()).toEqual(["src/a.md", "src/b.md"]);
  });

  it("resolves links case-insensitively, by name, relative and by vault path", () => {
    const files: Record<string, string> = {
      "notes/index.md": "[[PIC.PNG]] [x](../src/sub/doc.pdf) [[/src/abs.png]] [[sub/partial]]",
      "src/pic.png": "",
      "src/sub/doc.pdf": "",
      "src/abs.png": "",
      "src/sub/partial.md": "",
      "src/nope.png": "",
    };
    const result = reachableCandidates(Object.keys(files), isCandidate, (f) => files[f]);
    expect([...result].sort()).toEqual([
      "src/abs.png",
      "src/pic.png",
      "src/sub/doc.pdf",
      "src/sub/partial.md",
    ]);
  });
});

describe("RemoveUnlinkedNotes filter", () => {
  const plugin = RemoveUnlinkedNotes({ folders: ["src"] });

  it("keeps pages outside the configured folders", () => {
    const ctx = vault({ "notes/readme.md": "" });
    expect(plugin.shouldPublish(ctx, page("notes/readme.md"))).toBe(true);
  });

  it("publishes linked notes and drops unlinked ones", () => {
    const ctx = vault({
      "index.md": "[[linked]]",
      "src/linked.md": "",
      "src/orphan.md": "",
    });
    expect(plugin.shouldPublish(ctx, page("src/linked.md"))).toBe(true);
    expect(plugin.shouldPublish(ctx, page("src/orphan.md"))).toBe(false);
  });

  it("drops notes that only an ignored folder links to", () => {
    const ctx = vault({ "Privat/secret.md": "[[hidden]]", "src/hidden.md": "" }, ["Privat"]);
    expect(plugin.shouldPublish(ctx, page("src/hidden.md"))).toBe(false);
  });

  it("publishes excalidraw drawings that are embedded", () => {
    const ctx = vault({
      "index.md": "![[Plan.excalidraw]]",
      "src/Plan.excalidraw.md": "",
      "src/Unused.excalidraw.md": "",
    });
    expect(plugin.shouldPublish(ctx, page("src/Plan.excalidraw.md"))).toBe(true);
    expect(plugin.shouldPublish(ctx, page("src/Unused.excalidraw.md"))).toBe(false);
  });

  it("publishes file-backed pages that Quartz reports as referenced", () => {
    const ctx = vault({ "index.md": "", "src/board.canvas": "{}" });
    const referenced = page("src/board.canvas", { referencedBy: ["index"] });
    const unreferenced = page("src/board.canvas", { referencedBy: [] });
    expect(plugin.shouldPublish(ctx, referenced)).toBe(true);
    expect(plugin.shouldPublish(ctx, unreferenced)).toBe(false);
  });

  it("matches the folder option case-insensitively and with slashes", () => {
    const ctx = vault({ "SRC/orphan.md": "" });
    expect(
      RemoveUnlinkedNotes({ folders: ["/src/"] }).shouldPublish(ctx, page("SRC/orphan.md")),
    ).toBe(false);
  });
});
