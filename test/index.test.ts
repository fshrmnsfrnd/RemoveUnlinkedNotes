import { describe, expect, it } from "vitest";
import { VFile } from "vfile";
import type { BuildCtx, FullSlug } from "@quartz-community/types";
import { RemoveUnlinkedNotes } from "../src/index";

const slug = (value: string): FullSlug => value as FullSlug;

describe("RemoveUnlinkedNotes", () => {
  it("keeps files outside configured folders", () => {
    const plugin = RemoveUnlinkedNotes({ folders: ["attachments"] });
    const file = new VFile("");
    file.data.slug = slug("notes/readme");

    expect(plugin.shouldPublish({} as BuildCtx, [{ type: "root", children: [] }, file])).toBe(true);
  });

  it("filters unlinked files in configured folders", () => {
    const plugin = RemoveUnlinkedNotes({ folders: ["attachments"] });
    const file = new VFile("");
    file.data.slug = slug("attachments/orphan.png");

    expect(plugin.shouldPublish({} as BuildCtx, [{ type: "root", children: [] }, file])).toBe(
      false,
    );
  });
});
