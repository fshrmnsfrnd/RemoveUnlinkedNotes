# Remove Unlinked Notes

Quartz 5 filter plugin: pages in the configured folders are only published when a published page
links to or embeds them. Meant for an attachments folder (e.g. `src`) that holds notes, Excalidraw
drawings, canvases and other files used from elsewhere in the vault.

A link counts only when it comes from a file Quartz builds. A note in an ignored folder
(`ignorePatterns`) does not keep anything in `src` alive, and neither does a note in `src` that is
itself unlinked.

## Installation

In `quartz.config.yaml`:

```yaml
configuration:
  # Copy only images, PDFs, … that published pages reference (built into Quartz 5.1)
  publishAssets: referenced

plugins:
  - source: github:fshrmnsfrnd/RemoveUnlinkedNotes
    enabled: true
    options:
      folders:
        - src
```

`publishAssets: referenced` is what removes unlinked **assets** (images, PDFs, …): Quartz copies
only the files that the pages it publishes link to or embed. It applies to every folder, and runs
after the filters, so assets used only by pages this plugin dropped are left out as well.

This plugin handles the **pages** in the folders: Markdown notes, `.excalidraw.md` drawings,
`.canvas` and `.base` files.

## How links are found

Quartz runs filters on one page at a time, before its link processing is complete, so the plugin
reads the Markdown and canvas sources of the files Quartz builds itself and follows:

- wikilinks and embeds: `[[Note]]`, `[[Note#Heading|alias]]`, `![[image.png|200]]`
- Markdown links and images: `[text](path/to/file.pdf)`, `![](<file with spaces.png>)`
- raw HTML attributes: `src`, `href`, `data`, `poster`
- canvas file cards and links in canvas text cards

Links resolve as Obsidian does: case-insensitive, by vault path, relative to the note, or by file
name anywhere in the vault. An ambiguous name keeps every file it could mean. Links in fenced code
blocks are ignored.

For pages that page types render from files (drawings, canvases, bases), Quartz 5.1 also reports
which published pages link to them; either source is enough to publish the page.

## Development

```bash
npm install
npm run check
npm run build
```

`dist/` is committed, because Quartz installs the plugin from GitHub and uses the pre-built files.

## License

MIT
