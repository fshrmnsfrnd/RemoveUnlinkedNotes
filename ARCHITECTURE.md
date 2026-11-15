# Architecture

The plugin is implemented in [`src/index.ts`](./src/index.ts) and participates in all three
relevant Quartz phases:

1. **Transformer** collects outgoing links from each processed file.
2. **Filter** excludes Markdown files in configured folders when no collected link targets them.
3. **Emitter** removes unlinked non-HTML assets from the corresponding output folders.

[`src/types.ts`](./src/types.ts) re-exports the Quartz types used by consumers and defines the
plugin options. [`src/build/validate-manifest.ts`](./src/build/validate-manifest.ts) validates the
package manifest before a build.

The package exposes the main plugin from `dist/index.js` and public types from `dist/types.js`.
