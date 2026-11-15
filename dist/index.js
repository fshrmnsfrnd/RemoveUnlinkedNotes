import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';

createRequire(import.meta.url);
var RemoveUnlinkedNotes = (opts) => {
  const folders = opts?.folders ?? [];
  const linkedSlugs = /* @__PURE__ */ new Set();
  return {
    name: "RemoveUnlinkedNotes",
    // PHASE 1: TRANSFORMER
    // Wird aufgerufen, NACHDEM Quartz die Links aus dem Markdown extrahiert hat.
    // Wir sammeln alle diese Links global in unserem Set.
    htmlPlugins() {
      return [
        () => {
          return (_tree, file) => {
            const links = file.data?.links ?? [];
            for (const link of links) {
              linkedSlugs.add(link);
            }
          };
        }
      ];
    },
    // PHASE 2: FILTER
    // Wendet sich NUR auf Markdown-Dateien (.md) an.
    shouldPublish(_ctx, [_tree, file]) {
      const slug = file.data?.slug;
      if (!slug) return true;
      const isInFolder = folders.some((folder) => slug.startsWith(folder + "/"));
      if (!isInFolder) return true;
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
        }
      }
      return [];
    }
  };
};

export { RemoveUnlinkedNotes };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map