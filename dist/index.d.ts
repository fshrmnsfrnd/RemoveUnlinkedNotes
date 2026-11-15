import { QuartzTransformerPluginInstance, QuartzFilterPluginInstance, QuartzEmitterPluginInstance } from '@quartz-community/types';
import { RemoveUnlinkedOptions } from './types.js';

declare const RemoveUnlinkedNotes: (opts?: RemoveUnlinkedOptions) => QuartzTransformerPluginInstance & QuartzFilterPluginInstance & QuartzEmitterPluginInstance;

export { RemoveUnlinkedNotes };
