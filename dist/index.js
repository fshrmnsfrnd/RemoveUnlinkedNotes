import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';

createRequire(import.meta.url);
var activeBuildId;
var linkedSlugs = /* @__PURE__ */ new Set();
var resetForBuild = (buildId) => {
  if (activeBuildId === buildId) return;
  activeBuildId = buildId;
  linkedSlugs.clear();
};
var normalizeSlug = (slug) => {
  const [withoutFragment] = decodeURIComponent(slug).replace(/^\/+/, "").replace(/^\.\//, "").split("#", 1);
  return withoutFragment ?? "";
};
var RemoveUnlinkedNotes = (opts) => {
  const folders = opts?.folders ?? [];
  return {
    name: "RemoveUnlinkedNotes",
    htmlPlugins(ctx) {
      resetForBuild(ctx.buildId);
      return [
        () => {
          return (_tree, file) => {
            const links = file.data?.links ?? [];
            for (const link of links) {
              linkedSlugs.add(normalizeSlug(link));
            }
          };
        }
      ];
    },
    shouldPublish(ctx, [_tree, file]) {
      resetForBuild(ctx.buildId);
      const slug = file.data?.slug;
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
        }
      }
      return [];
    }
  };
};

export { RemoveUnlinkedNotes };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map