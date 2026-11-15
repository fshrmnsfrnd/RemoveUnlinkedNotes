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

// Das Plugin implementiert alle drei Phasen (Transformer, Filter, Emitter) in einem einzigen State
export const RemoveUnlinkedNotes: (
  opts?: RemoveUnlinkedOptions,
) => QuartzTransformerPluginInstance & QuartzFilterPluginInstance & QuartzEmitterPluginInstance = (
  opts,
) => {
  const folders = opts?.folders ?? [];

  // Globaler State: Speichert alle im Vault gefundenen, ausgehenden Links
  const linkedSlugs = new Set<string>();

  return {
    name: "RemoveUnlinkedNotes",

    // PHASE 1: TRANSFORMER
    // Wird aufgerufen, NACHDEM Quartz die Links aus dem Markdown extrahiert hat.
    // Wir sammeln alle diese Links global in unserem Set.
    htmlPlugins() {
      return [
        () => {
          return (_tree: Root, file: VFile) => {
            // Quartz legt alle gefundenen Links der aktuellen Datei in file.data.links ab
            const links = (file.data?.links ?? []) as string[];
            for (const link of links) {
              linkedSlugs.add(link);
            }
          };
        },
      ];
    },

    // PHASE 2: FILTER
    // Wendet sich NUR auf Markdown-Dateien (.md) an.
    shouldPublish(_ctx, [_tree, file]) {
      const slug = file.data?.slug as string | undefined;
      if (!slug) return true;

      // Prüfen, ob die Datei in einem der Ziel-Ordner liegt
      const isInFolder = folders.some((folder) => slug.startsWith(folder + "/"));
      if (!isInFolder) return true;

      // Wenn ja, darf sie nur in den Build, wenn eine andere Datei auf sie verlinkt
      return linkedSlugs.has(slug);
    },

    // PHASE 3: EMITTER
    async emit(ctx, _content, _resources) {
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

            if (!linkedSlugs.has(assetSlug)) {
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
