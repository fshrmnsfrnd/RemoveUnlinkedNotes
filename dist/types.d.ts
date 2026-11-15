export { BuildCtx, CSSResource, ChangeEvent, JSResource, PageGenerator, PageMatcher, ProcessedContent, QuartzEmitterPlugin, QuartzEmitterPluginInstance, QuartzFilterPlugin, QuartzFilterPluginInstance, QuartzPageTypePlugin, QuartzPageTypePluginInstance, QuartzPluginData, QuartzTransformerPlugin, QuartzTransformerPluginInstance, StaticResources, VirtualPage } from '@quartz-community/types';

interface RemoveUnlinkedOptions extends Record<string, unknown> {
    /** Ordner relativ zum Vault-Root, deren nicht verlinkte Dateien entfernt werden. */
    folders: string[];
}

export type { RemoveUnlinkedOptions };
