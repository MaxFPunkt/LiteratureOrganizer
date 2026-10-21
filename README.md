# LitNet — Literature Network

A single-file, offline-capable tool for exploring a literature review as a citation network. Import papers from Zotero (BibLaTeX), write per-paper notes, connect papers with labelled "cites" arrows, and lay the network out several ways (radial, layered, single-circle with edge bundling, grid, force-directed).

Everything runs in the browser — no server, no build step, no dependencies. Your data is stored locally and can be opened/saved as a `.json` file.

## Use it

Just open `index.html` (or `LitNet.html` — they are identical) in any modern browser. The two files are the same app; `index.html` exists so static hosts serve it automatically.

## Host it on GitHub Pages

GitHub Pages serves static files for free at `https://<your-username>.github.io/<repo>/`. Because LitNet is a single HTML file, hosting is just "put `index.html` in a repo and turn Pages on."

### Option A — entirely in the browser (no Git knowledge needed)

1. Create a free account at https://github.com and click **New repository**. Name it e.g. `litnet`, make it **Public**, and create it.
2. On the new repo page, click **Add file → Upload files**.
3. Drag in `index.html` (and optionally `README.md` and `LICENSE`). Click **Commit changes**.
4. Go to **Settings → Pages** (left sidebar).
5. Under **Build and deployment → Source**, choose **Deploy from a branch**. Set **Branch** to `main` and folder to `/ (root)`. Click **Save**.
6. Wait ~1 minute, then reload the Pages settings page — it will show your live URL, like `https://<your-username>.github.io/litnet/`. Share that link.

To update the app later, upload a new `index.html` (Add file → Upload files → Commit). Pages redeploys automatically within a minute.

### Option B — with Git on the command line

```bash
# from this folder
git init
git add index.html README.md LICENSE
git commit -m "LitNet"
git branch -M main
git remote add origin https://github.com/<your-username>/litnet.git
git push -u origin main
```

Then enable Pages as in steps 4–6 above.

### Notes

- **Custom domain:** Settings → Pages → Custom domain, then add the CNAME at your DNS provider.
- **Open/Save to file:** the in-app *Open* / *Save* (File System Access API) works in Chromium browsers (Chrome/Edge) and requires a secure context — `https://...github.io` qualifies. Firefox/Safari fall back to open-a-copy + download.
- **Privacy:** there is no backend. Each visitor's library lives only in their own browser (localStorage) and in any `.json` files they save. Nothing is uploaded anywhere.

## Features

- BibLaTeX import (paste from Zotero) and export (file or clipboard)
- Per-paper notes; hover/tap a node to preview
- Directed "cites" arrows with editable relationship labels (hidable; pin individually with Alt-click, or toggle all)
- Search across titles, authors and notes — matches glow; matching arrow-notes reveal their endpoints
- Layouts: radial, layered, single-circle (hierarchical edge bundling with adjustable strength), grid, force-directed
- Saved layouts (bookmarks) you can restore
- Card or circle node rendering, per-node or globally
- Open/Save a `.json` file directly; Ctrl/⌘+S to save; full undo

- **Tags & colour-by-tag** — tag papers in the side panel, filter with `#tag` in search, optionally colour nodes by first tag (Layout menu)
- **Reading status** — 📕 to read / 📖 skimmed / ✅ read per paper, shown as a dot on each node
- **Multi-select** — Ctrl+drag a box (or Ctrl+click) to select several papers; move, tag, set status, or delete as a group
- **Focus mode** — 🎯 dims everything beyond two hops of the selected paper
- **Timeline layout** — columns by year, oldest to newest
- **Library stats** — the empty side panel shows notes coverage, status counts, most-cited papers, and unconnected papers
- **Auto-link via OpenAlex** — ＋ Add → 🔍 Auto-link looks up each paper's reference list by DOI/arXiv ID and draws missing citation edges automatically (needs internet)
- **Metadata fetch** — in the Add/Edit form, ⤓ Fetch fills title/authors/year/venue from a DOI or arXiv ID
- **Related-work draft** — Export → 📝 writes a Markdown skeleton grouped by tag with your notes and matching `\cite{}` keys

- **Snap while dragging** — nodes snap to the canvas grid and align to other nodes' centres and edges (orange guide lines); hold `Ctrl` to bypass, toggle in Layout ▾
- **Full undo/redo** — `Ctrl+Z`/`Ctrl+Y` now also covers node moves, note/tag/label edits, status and shape changes

- **Manual colours & styles** — pick a palette or custom colour per paper (side panel, also bulk via multi-select) and set a style: ⭐ Highlight (colour ring + star) or Faded
- **Cleaner edge labels** — labels rotate along their arrow, sit just off the line, hide on dimmed edges, and slide along the edge to avoid nodes and other labels

## Development

The app is built from modular sources in `src/` — edit those, never `index.html` / `LitNet.html` directly (both are generated and carry a warning banner).

```
src/template.html   page skeleton (toolbar, modals, placeholders)
src/styles.css      all CSS
src/js/01-bib.js    BibLaTeX parser + exporter
src/js/02-state.js  state, persistence, undo/redo, graph helpers
src/js/03-canvas.js canvas rendering, edge bundling
src/js/04-interact.js  mouse/touch interaction, hit testing
src/js/05-layouts.js   layout algorithms + bookmarks
src/js/06-ui.js     menus, panels, modals, keyboard shortcuts
src/js/07-files.js  open/save/export
src/js/08-boot.js   startup
```

Rebuild both output files with:

```
node build.js
```

## License

MIT — see `LICENSE`.
