# Remove Unlinked Notes

Quartz plugin that removes unlinked Markdown notes and assets from configured folders.

## Installation

```bash
npm install github:fshrmnsfrnd/RemoveUnlinkedNotes
```

## Configuration

Add the plugin to `quartz.config.ts`:

```ts
import { RemoveUnlinkedNotes } from "quartz-plugin-remove-unlinked";

const removeUnlinkedNotes = RemoveUnlinkedNotes({ folders: ["attachments", "private"] });

export default {
  plugins: {
    transformers: [removeUnlinkedNotes],
    filters: [removeUnlinkedNotes],
    emitters: [removeUnlinkedNotes],
  },
};
```

The plugin shares its collected links across its transformer, filter, and emitter instances. The
`folders` paths are relative to the vault root.

## Development

```bash
npm install
npm run check
npm run build
```

## License

MIT
