import type { BuildCtx, QuartzFilterPlugin } from "@quartz-community/types";
import fs from "node:fs";
import path from "node:path";
import { pathKey, reachableCandidates } from "./links";
import type { RemoveUnlinkedOptions } from "./types";

/**
 * Publishes a page from one of the configured folders only when a published page links to it.
 *
 * Quartz hands a filter one page at a time, before it knows which pages link where, so for notes
 * the plugin reads the links from the Markdown sources itself (`ctx.allFiles` — the vault without
 * the ignored folders). Pages that page types render from files (Excalidraw drawings, canvases,
 * bases) reach the filter later with `referencedBy` filled in by Quartz, which is used as is.
 *
 * Assets (images, PDFs, …) are not pages and never reach a filter: set
 * `configuration.publishAssets: referenced` in the Quartz config for those.
 */
export const RemoveUnlinkedNotes: QuartzFilterPlugin<RemoveUnlinkedOptions> = (opts) => {
  const folders = (opts?.folders ?? []).map(pathKey).filter((folder) => folder.length > 0);
  const inFolder = (file: string): boolean => {
    const key = pathKey(file);
    return folders.some((folder) => key.startsWith(folder + "/"));
  };

  let cache: { buildId: string; linked: Set<string> } | undefined;
  const linkedFiles = (ctx: BuildCtx): Set<string> => {
    if (cache?.buildId === ctx.buildId) return cache.linked;
    const reachable = reachableCandidates(ctx.allFiles ?? [], inFolder, (file) => {
      try {
        return fs.readFileSync(path.join(ctx.argv.directory, file), "utf8");
      } catch {
        return undefined; // unreadable: Quartz reports it when it parses the file
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

      // A page that stands for a file (drawing, canvas, base): Quartz 5.1+ also lists the
      // published pages that link to it.
      const referencedBy = file.data.referencedBy ?? [];
      return referencedBy.some((slug) => slug !== file.data.slug);
    },
  };
};

export default RemoveUnlinkedNotes;
export type { RemoveUnlinkedOptions } from "./types";
