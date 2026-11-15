import { QuartzFilterPlugin } from '@quartz-community/types';
import { RemoveUnlinkedOptions } from './types.js';

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
declare const RemoveUnlinkedNotes: QuartzFilterPlugin<RemoveUnlinkedOptions>;

export { RemoveUnlinkedNotes, RemoveUnlinkedOptions, RemoveUnlinkedNotes as default };
