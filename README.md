# LitNet — Literature Network

A single-file, offline-capable tool for exploring a literature review as a citation network. Import papers from Zotero (BibLaTeX), write notes per paper, connect papers with annotated "cites" arrows, and arrange the network with several layouts.

Everything runs in the browser: no server, no install, no dependencies. Your library is kept in the browser automatically and can be saved to and opened from a `.json` file.

## Use it

Open `index.html` (or `LitNet.html`, the same app) in a modern browser.

- **New** starts an empty library. If the current one has unsaved changes, LitNet asks whether to save it first. `Ctrl/⌘+Z` brings the previous papers back.
- **Open** and **Save** work directly on a `.json` file in Chrome and Edge. Firefox and Safari open a copy and save by downloading.
- **Export** offers Save as, a BibLaTeX file, BibLaTeX to the clipboard, and a Markdown related-work draft.
- A dot next to the library name means there are changes not yet saved to a file.

## Features

- **Papers and notes** — per-paper notes, tags, reading status (to read, skimmed, read) and abstract; hover a paper to preview its notes
- **Adding papers** — enter one by hand (fetch details from a DOI or arXiv ID via OpenAlex), or paste a BibLaTeX export from Zotero; imported papers go into free space without moving your layout
- **Citation links** — hold `Shift` and click two papers, or use Link mode (`L`); each link can carry a note on how the cited work is used
- **Find citation links** — looks up each paper's references on OpenAlex and draws the missing links (needs DOIs or arXiv IDs and an internet connection)
- **Link notes** — hidden by default; show all with `T`, or pin individual ones with `Alt`+click on the arrow
- **Search** — matches titles, authors, notes and link notes and marks hits with a highlighter; start with `#` to filter by tag
- **Layouts** — radial, layered, single circle with adjustable edge bundling, grid, force-directed and timeline; save and restore named layouts
- **Display** — cards or circles (globally or per paper), colours with a nameable legend, Glow, Hero and Faded styles, focus mode that fades everything beyond two links
- **Selection** — `Ctrl/⌘`+drag or click to select several papers, then move, tag, colour or delete them together
- **Editing** — snap to grid and to other papers while dragging (hold `Ctrl` to place freely), full undo and redo
- **Layout for any window** — full toolbar on wide screens, icons in a side-by-side window, File menu and slide-over panel on phones; touch, drag and pinch-zoom supported

The help button at the bottom left of the canvas lists every shortcut.

## Host it on GitHub Pages

This repository can serve the app directly:

1. On GitHub, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**, select `main` and `/ (root)`, then **Save**.
3. After about a minute the app is live at `https://maxfpunkt.github.io/LiteratureOrganizer/`.

Pages redeploys automatically whenever `main` changes. On a free GitHub plan, Pages requires the repository to be public.

There is no backend. Each visitor's library lives only in their own browser and in the `.json` files they save; nothing is uploaded.

## Development

The app is built from modular sources in `src/`. Edit those, never `index.html` or `LitNet.html` directly; both are generated and carry a warning banner.

```
src/template.html      page skeleton: toolbar, canvas controls, dialogs
src/styles.css         all CSS; design tokens are at the top
src/js/00-icons.js     the inline SVG icon set
src/js/01-bib.js       BibLaTeX parser and exporter
src/js/02-state.js     state, browser storage, undo/redo, graph helpers
src/js/03-canvas.js    canvas rendering, edge bundling
src/js/04-interact.js  mouse and touch interaction, hit testing
src/js/05-layouts.js   layout algorithms and saved layouts
src/js/06-ui.js        menus, side panel, dialogs, keyboard shortcuts
src/js/07-files.js     new, open, save, export
src/js/07-net.js       OpenAlex lookups
src/js/08-boot.js      startup
```

Rebuild both output files with:

```
node build.js
```

## License

MIT — see `LICENSE`.
