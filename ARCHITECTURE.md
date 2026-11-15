# Architecture

The plugin is a single Quartz filter ([`src/index.ts`](./src/index.ts)).

1. On the first `shouldPublish` call of a build (keyed by `ctx.buildId`), it reads every Markdown
   and canvas file in `ctx.allFiles` (the vault without ignored folders) and computes which files
   in the configured folders are reachable from files outside them
   ([`src/links.ts`](./src/links.ts)): a breadth-first walk that follows links into the folders and
   on through the linked notes there.
2. A page in a configured folder is published when its source file is reachable. Pages that page
   types render from files also carry `file.data.referencedBy` (Quartz 5.1+), which counts too.

The filter does not rely on `file.data.links`: Quartz fills it in the HTML stage, possibly in
worker threads, and only for `<a>` links, so it is neither complete nor shared state the filter
can read.

Assets are not pages and never reach a filter. They are handled by Quartz's own
`configuration.publishAssets: referenced`.

[`src/types.ts`](./src/types.ts) re-exports the Quartz types used by consumers and defines the
plugin options. [`src/build/validate-manifest.ts`](./src/build/validate-manifest.ts) validates the
package manifest before a build.
