import type {
  QuartzTransformerPluginInstance,
  QuartzFilterPluginInstance,
  QuartzEmitterPluginInstance,
} from "@quartz-community/types";
import type { Root } from "mdast";
import type { VFile } from "vfile";
import fs from "node:fs/promises";
import path from "node:path";
import type { RemoveUnlinkedOptions } from "./types";

let activeBuildId: string | undefined;
const linkedSlugs = new Set<string>();

const resetForBuild = (buildId: string): void => {
  if (activeBuildId === buildId) return;
  activeBuildId = buildId;
  linkedSlugs.clear();
};

const normalizeSlug = (slug: string): string => {
  const [withoutFragment] = decodeURIComponent(slug)
    .replace(/^\/+/, "")
    .replace(/^\.\//, "")
    .split("#", 1);
  return withoutFragment ?? "";
};

export const RemoveUnlinkedNotes: (
  opts?: RemoveUnlinkedOptions,
) => QuartzTransformerPluginInstance & QuartzFilterPluginInstance & QuartzEmitterPluginInstance = (
  opts,
) => {
  const folders = opts?.folders ?? [];

  return {
    name: "RemoveUnlinkedNotes",

    htmlPlugins(ctx) {
      resetForBuild(ctx.buildId);

      return [
        () => {
          return (_tree: Root, file: VFile) => {
            const links = (file.data?.links ?? []) as string[];
            for (const link of links) {
              linkedSlugs.add(normalizeSlug(link));
            }
          };
        },
      ];
    },

    shouldPublish(ctx, [_tree, file]) {
      resetForBuild(ctx.buildId);

      const slug = file.data?.slug as string | undefined;
      if (!slug) return true;

      const isInFolder = folders.some((folder) => slug.startsWith(folder + "/"));
      if (!isInFolder) return true;

      return linkedSlugs.has(normalizeSlug(slug));
    },

    async emit(ctx, _content, _resources) {
      resetForBuild(ctx.buildId);
      const outputDir = ctx.argv.output;

      for (const folder of folders) {
        const folderPath = path.join(outputDir, folder);

        try {
          const files = await fs.readdir(folderPath, { recursive: true });

          for (const file of files) {
            const fullPath = path.join(folderPath, file);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) continue;

            const ext = path.extname(file);
            if (ext === ".html" || ext === "") continue;

            const assetSlug = path.posix.join(folder, file.replace(/\\/g, "/"));

            if (!linkedSlugs.has(normalizeSlug(assetSlug))) {
              await fs.rm(fullPath, { force: true });
            }
          }
        } catch (err) {
          // Ordner existiert nicht -> ignorieren
        }
      }

      // HIER IST DER FIX:
      // Wir geben direkt ein leeres Array zurück. Da die Funktion durch das Plugin-Interface
      // typisiert ist, weiß TypeScript hier automatisch, dass `[]` den Typ `FilePath[]` erfüllt.
      // Kein any, keine Linter-Fehler!
      return [];
    },
  };
};
