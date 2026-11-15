import { describe, expect, it } from "vitest";
import { VFile } from "vfile";
import type { BuildCtx, FullSlug, SimpleSlug } from "@quartz-community/types";
import type { Root } from "mdast";
import { RemoveUnlinkedNotes } from "../src/index";

const slug = (value: string): FullSlug => value as FullSlug;
const simpleSlug = (value: string): SimpleSlug => value as SimpleSlug;
const buildCtx = { buildId: "test-build" } as BuildCtx;

describe("RemoveUnlinkedNotes", () => {
  it("keeps files outside configured folders", () => {
    const plugin = RemoveUnlinkedNotes({ folders: ["attachments"] });
    const file = new VFile("");
    file.data.slug = slug("notes/readme");

    expect(plugin.shouldPublish(buildCtx, [{ type: "root", children: [] }, file])).toBe(true);
  });

  it("filters unlinked files in configured folders", () => {
    const plugin = RemoveUnlinkedNotes({ folders: ["attachments"] });
    const file = new VFile("");
    file.data.slug = slug("attachments/orphan.png");

    expect(plugin.shouldPublish(buildCtx, [{ type: "root", children: [] }, file])).toBe(false);
  });

  it("shares collected links across plugin instances", () => {
    const collector = RemoveUnlinkedNotes({ folders: ["attachments"] });
    const filter = RemoveUnlinkedNotes({ folders: ["attachments"] });
    const source = new VFile("");
    source.data.links = [simpleSlug("attachments/linked.png")];

    const [linkPlugin] = collector.htmlPlugins!(buildCtx);
    const transform = (linkPlugin as () => (tree: Root, file: VFile) => void)();
    transform({ type: "root", children: [] }, source);

    const target = new VFile("");
    target.data.slug = slug("attachments/linked.png");
    expect(filter.shouldPublish(buildCtx, [{ type: "root", children: [] }, target])).toBe(true);
  });
});
