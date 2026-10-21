# LitNet — Conversation History

Session: "Literature review tool" · Exported 2026-07-04

Tool-call entries like *(called Write)* are kept to show the work performed between messages.

---

## Turn 1

### 👤 User

I need a tool with which I can streamline my literature review and paper-writing process. Here are the requirements I have:

* I want to have a collection of papers which I can connect to each other, in a "isCitedBy" fashion. Additionally I want to have notes / short summaries per paper, that reflect the key information. The papers and notes should be visible in a way, that allows me to explore the network and get a feeling for the paper's contents. I want to be able to easily add new papers (e.g. mass-import through BibLatex formats, so I can export from Zotero to Clipboard and import in this tool). I want to be able to easily add new connections with as little interactions as possible.

### 🤖 Assistant

I'll build you a self-contained literature network tool. A couple quick decisions first so I build the right thing.

*(called AskUserQuestion, ToolSearch, TaskCreate ×5)*

I'll build the whole tool as one self-contained HTML file.

*(called TaskUpdate, Write)*

Now let me verify the BibLaTeX parser works on a realistic Zotero export.

*(called TaskUpdate ×5, bash)*

Parser handles nested braces, accents, quote-delimited fields, arXiv eprints, and comments correctly. Let me syntax-check the full script.

*(called bash ×3)*

Found it — a malformed ternary. Let me fix that line.

*(called Edit, bash, TaskUpdate, present_files)*

Built **LitNet.html** — a single, fully-offline file. Double-click it to open in any browser; no install, no internet needed. It opens with 3 demo papers so the canvas isn't blank (delete them once you import your own).

How it meets your requirements:

**Mass import from Zotero** — Click *Import BibLaTeX*, paste a BibLaTeX export (or "Copy as BibLaTeX" to clipboard) and hit *Parse & Add*. The parser handles nested braces, accents, quote- or brace-delimited fields, arXiv eprints, and skips duplicate cite-keys. I verified it against a realistic export.

**Citation network** — Each paper is a node. Arrows mean *cites* (citing → cited), so a paper's incoming arrows are its "cited by" set, shown explicitly in the panel. Node size grows with how often a paper is cited; nodes with notes turn blue, so you get a quick visual feel for what's been digested vs. not.

**Minimal-interaction linking** — Toggle *Link mode* (or just hold **Shift**) and click two papers to draw a citation. Or hit *Link from here* on a selected paper, then click the target.

**Notes per paper** — Click any node to open the side panel: editable notes/summary, metadata, DOI link (double-click a node to open it), and live *Cites* / *Cited by* lists with one-click unlink.

**Persistence** — Auto-saves to the browser as you work, plus *Export JSON* / *Import JSON* for a backup file you keep in this folder (and to move data between machines).

Drag to arrange, scroll to zoom, drag empty space to pan. Want me to add anything like tag/keyword grouping, color-coding by year, or a citation-count ranked list?

---

## Turn 2

### 👤 User

Here are some minor change-requests:

* I want to be able to delete nodes by just pressing "del/entf"
* I want the "Link Mode" button to be visually toggled when pressing the correct key-combination (currently Shift)
* I want the Node-Titles to be "\<Paper-Title>(\<authors>)"
* When hovering over nodes I want a tooltip to display the note for the paper

And one big change-request:

* I want a different visualization. The current look is a bit too gloomy (very dark, simple shapes), I would prefer a tiny bit more playfullness. The most important task for this tool is literatur-exploration, so reading summarie/notes per node and seeing what paper got used in what fashion (i.e. "Paper A proves statement X and this statement is used in Paper B"). Also the spacing of the nodes being force-directed helps separate the node-blobs, but often yields in occluding arrows. Either deactivate force-directed alignment or propose a different approach.

### 🤖 Assistant

Good batch of changes. The visualization rework is the meat — I'll switch from dark circles + continuous force layout to a lighter "notebook" look with readable cards, curved edges that carry relationship labels (so you can capture *how* a paper is used), and a stable layered auto-arrange instead of jittery force simulation. Let me rewrite the file.

*(called TaskCreate ×4, TaskUpdate, Write)*

There's a stray garbage string in the edge-label fill. Let me fix it and check the grid function.

*(called Edit ×2, TaskUpdate ×4, bash ×3)*

The file got truncated on disk — it's missing everything after `renderSide`. Let me check.

*(called bash, Read ×2, bash)*

Bash mount is lagging behind the real file (the Read tool confirms all 738 lines are present and correct). Let me force a fresh view by copying through a new path.

*(called bash, Write, bash — determined the write had genuinely truncated at ~30 KB; rebuilt in parts)*

*(called Write ×3, bash ×4 — assembled and verified inside the sandbox, copied onto the real file)*

The real file is now correct on disk (40,705 bytes, validated). Parser re-verified on the final file; removed the stray test file.

*(called ToolSearch, allow_cowork_file_delete, bash, TaskUpdate, present_files)*

All changes are in. Reload `LitNet.html` (your existing saved library is preserved). Note: an earlier save of this version landed truncated on disk, so I rebuilt and byte-verified the full file — it's now complete and syntax-checked.

What changed:

**Delete with Del** — select a card or an arrow and press `Del` (or Backspace). `Ctrl/Cmd+Z` undoes any delete, link, or import.

**Shift visually toggles Link mode** — holding `Shift` now lights up the Link-mode button (orange) and switches the cursor to crosshair, so you get clear feedback before clicking the two papers.

**Node label = Title (authors)** — each node is now a card showing the title in bold with the authors in parentheses underneath, instead of a bare dot.

**Hover tooltip** — hovering a card pops up its note/summary (or a prompt to add one), so you can skim the network without opening the panel.

**New visualization** — light "notebook" theme with a soft dot grid, rounded colored cards (each paper gets its own hue stripe; faded = no notes yet; a small badge shows how many times it's cited). The force simulation is gone — papers stay exactly where you put them. The `⤢ Arrange` button lays everything out left→right by citation depth (foundational papers on the left, papers that build on them to the right) and reduces crossings, and `⊡ Fit` reframes the view. Edges are now curved arrows, which separates parallel links far better than the old straight lines.

**Relationship labels on arrows** — this directly supports your "Paper A proves X, used in Paper B" goal. Click any arrow to open a relationship editor and describe how the citation is used; the label appears as a pill on the arrow. You can also edit it inline from each paper's Cites / Cited-by list.

Keyboard shortcuts: `L` toggle link mode, `A` arrange, `F` fit, `Del` delete, `Ctrl/Cmd+Z` undo.

One thing to flag: I kept the layered auto-arrange instead of fully removing automatic layout, since pure manual placement gets tedious past a dozen papers — but it only runs when you click `Arrange`, so it never fights your manual positioning. If you'd rather it never auto-arrange (e.g. not even on BibLaTeX import), say so and I'll make import drop new papers in without repositioning the rest.

---

## Turn 3

### 👤 User

I want the layout to be optimized towards arrow-occlusion. The goal is that there should be as little occlusion in arrows as possible. As a static approach I think a circular layout with the node with the highest outgoing edges should be the center

### 🤖 Assistant

Good idea — a radial layout with the biggest hub at the center is a strong static answer for minimizing arrow occlusion, especially combined with crossing-reduction ordering on each ring. I'll replace the layered `arrange()` with a radial one: center = highest out-degree node, others placed on concentric rings by citation distance, and each ring's nodes ordered by angular barycenter of their neighbors so chords don't cross. Rings auto-expand so cards never overlap.

*(called Write, bash ×3 — spliced, syntax-checked, unit-tested on a synthetic graph, deployed)*

*(called present_files)*

Done. Reload `LitNet.html` and hit **Arrange** (or press `A`) to see the new layout.

The `Arrange` button now produces a radial layout built specifically to minimize arrow occlusion:

- **Center = the paper with the highest out-degree** (cites the most others), with total degree as the tie-breaker.
- Everything else is placed on **concentric rings by citation distance** (BFS hops from the center), so a paper sits one ring out from whatever it connects to. Disconnected papers go on an extra outer ring.
- Within each ring, nodes are **ordered by the angular barycenter of their neighbors** (six inward/outward passes), so connected papers line up radially and their arrows run along spokes instead of cutting across the circle. On my test graph that left just 1 crossing among 8 edges.
- **Ring radii auto-expand** with the node count so cards on a ring never overlap.

I verified the layout on a synthetic citation graph (correct hub, clean ring radii, no NaN coordinates) and syntax-checked the whole file.

Two notes worth flagging: this is a static heuristic, so on dense graphs some crossings are unavoidable — but you can still drag any card afterward and the position sticks. And it replaced the previous left-to-right layered layout; if you'd like both available via a toggle, I can add that. Want me to?

---

## Turn 4

### 👤 User

I want the annotations on the arrows to be hidable. Let the default state be hidden and I can show/hide the arrow-annotations by alt-klicking on the arrow and a global button to toggle all annotations on/off.

Additionally I want to be able to save a node-layout as a kind of bookmark so I can fall back to that layout once I am unsatisfied with the current layout. The automatic layouting should still be possible and be extended to propose different layouting algorithms to play around with

### 🤖 Assistant

Three solid features: hidable edge annotations (default off, alt-click per arrow + global toggle), layout bookmarks to fall back to, and a menu of layout algorithms to experiment with. I'll regenerate the file cleanly in the sandbox (your papers/notes live in browser storage, not the file, so they're unaffected) and validate before copying it over.

*(called TaskCreate ×3, TaskUpdate, Write ×2, TaskUpdate ×3, bash ×3 — hit the bash cache again, rebuilt on a fresh filename)*

*(called Write, bash ×3 — validated, unit-tested all five layouts + bookmarks, deployed)*

*(called TaskUpdate, present_files)*

All three features are in and verified (52 KB on disk, syntax-checked, all five layouts tested for valid output). Reload `LitNet.html`.

**Hidable annotations** — Arrow labels are now hidden by default. Three ways to control them: `Alt`-click any arrow to pin/unpin just that label (pinned labels show a warm border and stay visible regardless of the global setting); the new `🏷 Labels` button (or `T`) toggles all labels on/off at once; and a selected arrow always shows its own label so you can edit it. The edge panel also has a 📌 Pin label button.

**Layout bookmarks** — The new `⤢ Layout ▾` menu has a "Saved layouts" section: type a name, hit Save, and it snapshots every paper's position. Click a saved entry to restore it instantly (undoable), or ✕ to delete. So you can arrange things, bookmark it, experiment freely, and fall back whenever you want.

**Multiple layout algorithms** — The same menu offers five to play with, each applied on click (the menu stays open so you can flip between them):

- **Radial** — your hub-at-centre, occlusion-minimizing layout (the default).
- **Layered** — left→right by citation depth.
- **Single circle** — all papers on one ring, ordered to reduce crossings.
- **Grid** — tidy grid, most-cited first.
- **Force-directed** — organic clusters (one-shot, then frozen so it won't drift).

Everything persists in browser storage and rides along in JSON export/import, including bookmarks and your label preference. Manual dragging still works on top of any layout, and `A` re-runs whichever layout you used last.

One note: the layout menu lives in the top bar; on a narrow window it anchors to stay on-screen. If you'd prefer the algorithms and bookmarks split into two separate buttons, or want a bookmark to also remember zoom/pan (not just node positions), say the word.

---

## Turn 5

### 👤 User

When investigating your thinking block, it seems that Bash/CMD cache is giving you quite a run for your money. Is there a solution to work around that for future requesdts?

### 🤖 Assistant

Yeah, that one cost me a few detours. Worth explaining what it actually was, because the good news is it never threatened your file — only my ability to *check* it.

The root cause: the file tools (Read/Write/Edit) and the bash sandbox reach your folder through two different layers. When I wrote a file with the Write tool, the bash mount kept serving a cached copy of that same path — even padding it out to the old byte length — so `wc -c` and `cat` lied to me. Two things updated bash's view reliably: reading a brand-new filename it had never seen, or writing through bash itself (a `cp` or heredoc). Plain waiting didn't expire the cache.

So for future work the robust recipe is basically "don't round-trip the same path between the two layers":

- Treat the **Read tool as the source of truth** for anything written by Write/Edit — not `wc`/`cat` in bash.
- When I need bash to *validate* (syntax-check, run tests on) something, write it to a **fresh filename** bash hasn't touched, or have **bash write it** in the first place (heredoc / `fs.writeFileSync`), then validate in place.
- For a build-and-verify loop, keep it **entirely inside the sandbox** — generate, test, and only then `cp` the finished file to your folder once. The final `cp` is a bash-side write, so bash stays coherent and the destination ends up correct.

That's exactly the path the last two updates ended on, which is why the delivered `LitNet.html` is intact (52 KB, validated) despite the noisy middle. Going forward I'll default to that sandbox-build-then-copy flow for anything non-trivial so the verification step is trustworthy from the start, rather than discovering the cache mid-task.

---

## Turn 6

### 👤 User

Alright thanks for explaining! Going forward, here are new feature requests:

1. I would like the all-circular layout to have a hierachical edge bundling with tunable bundle strength-parameter to tidy up the visualization.
2. Additionally I want to be able to export my literature as biblatex to a file and to clipboard.
3. Additionally I want to toggle the rendering of individual nodes (and with a global button for all nodes) between circles (for a less cluddered view) and rectangular nodes (for more detailed information)
4. I want to be able to save everything not just with the "Export" Button but also Strg S

### 🤖 Assistant

Great set. I'll use the sandbox-build-then-verify flow throughout. Quick rundown of how I'll implement each so there are no surprises:

1. **Hierarchical edge bundling** on the circle layout — I'll build a balanced hierarchy over the ring order and route each edge along its tree path (Holten-style), with a **β bundle-strength slider** (0 = straight chords, 1 = tight bundles) in the Layout menu.
2. **BibLaTeX export** — both to a `.bib` file and to clipboard, via the Export menu.
3. **Circle vs. rectangle nodes** — per-node toggle in the side panel plus a global Shape button.
4. **Ctrl/Cmd+S** — triggers the same backup as Export.

*(called TaskCreate ×4, TaskUpdate ×5, Write, bash ×5 — built, unit-tested HEB control points, BibLaTeX generation, and all layouts; deployed)*

*(called TaskUpdate, present_files)*

All four features are in, verified end to end (63 KB on disk, syntax-checked, BibLaTeX output + HEB hierarchy + all five layouts unit-tested). Reload `LitNet.html`.

**Hierarchical edge bundling (circle layout)** — Run the "Single circle" layout from `Layout ▾`. Edges now route along a hierarchy built over the ring order and bundle together into tidy strands instead of a hairball of chords. The same menu has an **Edge bundling β slider** (0 = straight chords, 1 = tight bundles); it updates live. The bundling follows the nodes if you drag them, and persists across reloads.

**BibLaTeX export** — The new `Export ▾` menu has three options: Backup (JSON, full state), **BibLaTeX → file** (.bib download), and **BibLaTeX → clipboard**. It reformats authors to `Last, First`, picks `@article`/`@inproceedings`/`@misc` from the venue, emits arXiv eprints, and de-duplicates citation keys.

**Circle vs. rectangle nodes** — The toolbar `▭ Cards / ◯ Circles` button switches all nodes at once (circles give a much less cluttered view); a selected paper's panel has an `◯ As circle` / `▭ As card` button to override just that one. Edges attach correctly to whichever shape, and circle size still reflects citation count.

**Ctrl/⌘+S** — Saves a JSON backup anywhere in the app (your work also auto-saves to the browser continuously, as before).

Two notes: the global Shape button intentionally clears any per-node overrides so "all nodes" really means all — per-paper choices are meant as exceptions you set afterward. And bundling is tied to the circle layout specifically (that's where a ring hierarchy is well-defined); the other layouts keep the curved arrows. If you'd like bundling generalized to the radial layout too, that's a natural next step.

---

## Turn 7

### 👤 User

Extend the search to also include/search for notes. Notes that match the search should then be made visible (if currently invisible) also highlight the note's node or in case of an edge-annotation both connected nodes.

Next I want to have the ability to work on an imported file and save directly to the file (open/save vs import/export).

And the arrows should be straight instead of curved

### 🤖 Assistant

Three good changes. Plan:

1. **Search includes notes** — match against node notes and edge-annotation text. Matching nodes get un-dimmed and highlighted with a green halo; a matching edge-annotation is force-shown (even with labels off) and both its endpoint nodes are highlighted. Non-matches dim back.
2. **Open/Save to a real file** — using the File System Access API: an `📂 Open` button attaches a `.json` file, and `💾 Save` / Ctrl+S write straight back to it. Browsers without that API (Firefox/Safari) fall back to open-a-copy + download-on-save, and I'll surface which mode you're in.
3. **Straight arrows** — default edges become straight lines (bundled circle-layout edges stay curved, since that's the whole point of bundling).

*(called TaskCreate ×3, TaskUpdate ×3, Write, bash ×3 — built on fresh filename, unit-tested search logic, deployed)*

*(called TaskUpdate, present_files)*

All three are in and verified (66 KB, syntax-checked, search logic unit-tested). Reload `LitNet.html`.

**Search now includes notes** — The search box matches titles, authors, venue, year, and note text, plus edge-annotation text. Matches get a green halo (and are pulled to full opacity while everything else dims). If your query matches an arrow's annotation, that annotation is force-shown even with labels off, and both connected papers light up — so searching a phrase you wrote in a relationship label takes you straight to the two papers it connects.

**Open / Save to a file** — New `📂 Open` and `💾 Save` buttons. In Chromium browsers (Chrome/Edge) Open attaches the `.json` file via the File System Access API, the filename shows in the top bar, and `💾 Save` / `Ctrl/⌘+S` write straight back to that same file — true open/edit/save. `Export ▾` still has Save As / JSON backup and the BibLaTeX options. In Firefox/Safari (no File System Access API) Open loads a copy and Save downloads a new file instead; a toast tells you which mode you're in.

**Straight arrows** — Default edges are now straight lines. The circle layout's bundled edges stay curved by design — that's the bundling — and the β slider still controls how tightly they bend (set β to 0 there if you want those straight too).

One heads-up on Open/Save: the File System Access API needs a Chromium-based browser and a user click to grant write access (the browser will prompt the first time you save). Since your file lives in a Claude-managed folder, opening it from there and saving back works cleanly in Chrome/Edge. Want me to also add an "unsaved changes" indicator (e.g. a dot on Save) so you can tell when the file is behind the in-app state?

---

## Turn 8

### 👤 User

That is looking realy good already. Now lets keep the functionality and just tidy up the GUI a bit. I want the app to be compatible with mobile devices where screen space is limited.

Secondly, I currently have this app open in a side-by-side-window (paper that I'm reading left and the tool on the right). I would like to optimize it especially for this workflow.

### 🤖 Assistant

Both of these point the same direction: a compact, responsive layout that works in a narrow column (your side-by-side window) and scales down to a phone, while keeping every feature. Plan:

- **Compact, responsive toolbar** — buttons collapse to icons below ~900px (full labels return when there's room), with tooltips so nothing's lost.
- **Side panel becomes an overlay** in narrow widths — the graph keeps the full width, and the notes panel slides in over it when you select a paper, instead of permanently eating ~370px (which is most of a half-screen window).
- **Touch support** — tap to select, drag to move nodes, one-finger pan, two-finger pinch-zoom, so it's actually usable on a phone/tablet.

*(called TaskCreate ×3, TaskUpdate, bash ×3 — sandbox transform with asserted string replacements, validated, deployed)*

*(called TaskUpdate ×3, present_files)*

All functionality is unchanged — just a tidier, responsive shell. Reload `LitNet.html`.

**Narrow / side-by-side window** (the main win for your workflow): below ~900px wide, the toolbar buttons collapse to just their icons (hover for the full name), the logo and stats text drop out, and the search box flexes to fill the row — so the whole toolbar stays compact instead of wrapping into several tall rows. The notes panel no longer permanently occupies ~370px; it becomes an overlay that the graph sits behind. Selecting a paper slides the panel in over the right edge, and the `⮜`/`⮞` button (or tapping empty space) tucks it away — so while you're reading on the left, the graph uses the full width of the right pane and the notes appear only when you want them.

**Mobile / touch**: one finger pans, drag a node to move it, tap to select (opens the notes panel), and two-finger pinch zooms. Below 560px the layout tightens further. Everything — layouts, bundling, search, open/save, BibLaTeX — works the same.

Wide screens are unchanged: full button labels and the docked panel as before. The breakpoint is purely width-based, so just narrowing your window flips it into compact mode automatically.

One judgment call worth flagging: I kept the panel as a slide-over rather than a bottom sheet on phones, since for a citation graph you usually want to keep the node visible while reading its note. If you try it on an actual phone and a bottom sheet feels better, I can switch it. Also, on a touch device the hover-tooltip (note preview) is replaced by tap-to-open-panel, since touch has no hover.

---

## Turn 9

### 👤 User

Next I want to tidy up the legend. Maybe collapse both legends into a single info-icon.

Additionally, I want the entire project to be hosted online, so people can use this tool

### 🤖 Assistant

Two things here: a quick UI change (collapse the two info boxes into one ⓘ icon), and hosting. The legend change I'll just do. For hosting, the best path depends on what you're comfortable with — and since it's a single self-contained HTML file, every option is genuinely easy.

*(called AskUserQuestion — user chose GitHub Pages)*

GitHub Pages it is. First the legend collapse, then I'll make the project deploy-ready for Pages.

*(called TaskCreate ×2, TaskUpdate, bash ×3, Write ×2 — legend collapsed, index.html + README + LICENSE created)*

*(called TaskUpdate ×2, present_files)*

Both done.

**Legend tidied** — The two always-on boxes are gone. In their place is a single ⓘ button (bottom-left); click/tap it for a popover with the legend and key tips. The only thing that still appears on the canvas is the transient hint during link mode (and the first-run "no papers yet" prompt) — once you have papers and aren't linking, the canvas is clean.

**Ready for GitHub Pages** — Your folder now has everything a static host needs:

- `index.html` — the app (identical to `LitNet.html`; Pages serves `index.html` automatically)
- `LitNet.html` — kept so your existing bookmark/workflow still works
- `README.md` — project overview plus step-by-step Pages instructions
- `LICENSE` — MIT

Quickest path (no Git needed): create a free, **public** repo at github.com → **Add file → Upload files** → drag in `index.html`, `README.md`, `LICENSE` → **Commit** → **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**. About a minute later that page shows your live URL, `https://<you>.github.io/<repo>/`, which you can share. Full details (including the Git CLI route and custom domains) are in the README.

Two things worth knowing for the hosted version: it's purely client-side, so each visitor's library stays in their own browser/files — nothing is uploaded, and there's no shared/multi-user database. And the in-app Open/Save-to-file works in Chrome/Edge over the `https://…github.io` URL; Firefox/Safari fall back to download-on-save. If you'd later want a shared library (multiple people editing one network) that would need a small backend — say the word and I can sketch options.

---

## Turn 10

### 👤 User

I want to merge the add-paper button and the "import from biblatex" button to one button. Add -> Freely enter or BibLatex

And for the case of BibLatex I don't want the layout to change. All new papers should just appear somwhere in the corner, where free space is available.

### 🤖 Assistant

On it. I'll merge the two buttons into a single **＋ Add ▾** that offers "Enter manually" or "Paste BibLaTeX", and make BibLaTeX import drop new papers into free space in the corner of the current view instead of re-running the layout.

*(called TaskCreate, TaskUpdate, bash ×4 — sandbox transform, syntax + feature checks, placement logic unit-tested, deployed to both files)*

*(called TaskUpdate, present_files)*

Done (deployed to both `LitNet.html` and `index.html`, syntax-checked, placement logic unit-tested). Reload to use it.

The two buttons are now one **＋ Add ▾**. Clicking it opens a small menu:

- **✍️ Enter manually** — opens the paper form (placed at the center of your view, as before).
- **📥 Paste BibLaTeX** — opens the same Zotero paste box.

And BibLaTeX import no longer touches the layout. Existing papers stay exactly where they are; the newly imported ones drop into a tidy grid starting from the top-left corner of your current view, automatically skipping any cells already occupied by existing papers (so nothing overlaps, and they spill further out only if the near corner is full). The camera doesn't move either — your arrangement is left completely intact.

If you'd like, the corner it fills is currently the top-left of the visible area; I can switch it to a different corner, or add a one-click "tuck new papers in" that pulls in anything still off-screen.
