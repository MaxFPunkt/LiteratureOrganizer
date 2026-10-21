/* ============================ Menus ============================ */
const layoutMenu=document.getElementById("layoutMenu");
const exportMenu=document.getElementById("exportMenu");
const addMenu=document.getElementById("addMenu");
const infoBtn=document.getElementById("infoBtn"), infoPop=document.getElementById("infoPop");
const legendBtn=document.getElementById("legendBtn"), legendPop=document.getElementById("legendPop");
const MENUS=[[layoutMenu,"btnLayout"],[exportMenu,"btnExport"],[addMenu,"btnAdd"],[infoPop,"infoBtn"],[legendPop,"legendBtn"]];
let exportOwner="btnExport";   // the export menu doubles as the phone "File" menu

function closeMenus(except){
  for(const [m,b] of MENUS){ if(m===except) continue; m.classList.remove("open"); }
  for(const id of ["btnLayout","btnExport","btnAdd","btnFile"]){ const el=document.getElementById(id); if(el) el.setAttribute("aria-expanded","false"); }
  infoBtn.classList.remove("on"); legendBtn.classList.remove("on");
  if(except===exportMenu) document.getElementById(exportOwner).setAttribute("aria-expanded","true");
}
function positionMenu(menu,btnId){ const r=document.getElementById(btnId).getBoundingClientRect();
  const w=menu.offsetWidth||280;
  menu.style.left=Math.max(8,Math.min(r.left,window.innerWidth-w-8))+"px"; menu.style.top=(r.bottom+6)+"px"; }
function toggleMenu(menu,btnId,render){
  const willOpen=!menu.classList.contains("open");
  closeMenus(willOpen?menu:null);
  if(!willOpen){ menu.classList.remove("open"); return; }
  render(); hydrateIcons(menu); menu.classList.add("open");
  document.getElementById(btnId).setAttribute("aria-expanded","true");
  positionMenu(menu,btnId);
}
function menuItem(attr,icon,main,sub,cls){
  return `<button class="item${cls?" "+cls:""}" role="menuitem" ${attr}>${ic(icon)}<span class="txt"><span class="main">${main}</span>${sub?`<span class="sub">${sub}</span>`:""}</span></button>`; }

/* ---- Layout menu ---- */
function renderLayoutMenu(){
  if(!layoutMenu.classList.contains("open") && !renderLayoutMenu._force){ /* render on demand only */ }
  let html='<h4>Arrange papers</h4>';
  for(const L of LAYOUTS){ html+=menuItem(`data-lay="${L.id}"`, L.id===lastLayout?"read":"layout", L.name, L.desc, L.id===lastLayout?"current":""); }
  html+=`<div class="ctl"><div class="range-head"><span>Bundling strength (single circle)</span><span id="bsVal">${bundleStrength.toFixed(2)}</span></div>
    <input type="range" id="bsSlider" min="0" max="1" step="0.05" value="${bundleStrength}" aria-label="Bundling strength"></div>`;
  html+=`<div class="ctl"><label><input type="checkbox" id="cbTag" ${colorByTag?"checked":""}>Colour papers by their first tag</label></div>`;
  html+=`<div class="ctl"><label><input type="checkbox" id="cbSnap" ${snapOn?"checked":""}>Snap to grid and other papers</label><span class="sub">Hold Ctrl while dragging to place freely</span></div>`;
  html+='<div class="divider"></div><h4>Saved layouts</h4>';
  if(bookmarks.length){ bookmarks.forEach((b,i)=>{
    html+=`<div class="bm"><span class="nm" data-bm="${i}" role="menuitem" tabindex="0" title="Restore this layout">${ic("bookmark")}<span>${esc(b.name)}</span></span><button class="x" data-bmdel="${i}" title="Delete saved layout">${ic("x")}</button></div>`; }); }
  else { html+='<p class="note">No saved layouts yet. Arrange the papers the way you like, then save it here.</p>'; }
  html+='<div class="saverow"><input id="bmName" placeholder="Name this layout"><button class="primary" id="bmSave">Save</button></div>';
  layoutMenu.innerHTML=html;
  layoutMenu.querySelectorAll("[data-lay]").forEach(b=>b.onclick=()=>{ runLayout(b.dataset.lay); });
  const bs=layoutMenu.querySelector("#bsSlider");
  bs.oninput=()=>{ bundleStrength=parseFloat(bs.value); layoutMenu.querySelector("#bsVal").textContent=bundleStrength.toFixed(2); save(); requestDraw(); };
  const cbT=layoutMenu.querySelector("#cbTag"); cbT.onchange=()=>{ colorByTag=cbT.checked; save(); requestDraw(); };
  const cbS=layoutMenu.querySelector("#cbSnap"); cbS.onchange=()=>{ snapOn=cbS.checked; save(); };
  layoutMenu.querySelectorAll("[data-bm]").forEach(b=>{ b.onclick=()=>restoreBookmark(+b.dataset.bm); b.onkeydown=ev=>{ if(ev.key==="Enter") restoreBookmark(+b.dataset.bm); }; });
  layoutMenu.querySelectorAll("[data-bmdel]").forEach(b=>b.onclick=()=>deleteBookmark(+b.dataset.bmdel));
  const inp=layoutMenu.querySelector("#bmName");
  layoutMenu.querySelector("#bmSave").onclick=()=>saveBookmark(inp.value);
  inp.onkeydown=ev=>{ if(ev.key==="Enter") saveBookmark(inp.value); };
}
document.getElementById("btnLayout").onclick=e=>{ e.stopPropagation(); toggleMenu(layoutMenu,"btnLayout",renderLayoutMenu); };

/* ---- Export / File menu ---- */
function renderExportMenu(withFile){
  let html="";
  if(withFile){
    html+='<h4>Library</h4>'
      +menuItem('data-x="new"',"fileNew","New library","Start with an empty canvas")
      +menuItem('data-x="open"',"open","Open…","A library file (.json)")
      +menuItem('data-x="save"',"save","Save", fileHandle? "Write to "+esc(currentFileName) : "Choose where to save")
      +'<div class="divider"></div>';
  }
  html+='<h4>Export</h4>'
    +menuItem('data-x="json"',"save","Save as…","A new copy as a .json file")
    +menuItem('data-x="bibfile"',"download","BibLaTeX file","A .bib file for LaTeX or Zotero")
    +menuItem('data-x="bibclip"',"copy","Copy BibLaTeX","To the clipboard")
    +menuItem('data-x="draft"',"draft","Related-work draft","Markdown with your notes, grouped by first tag");
  exportMenu.innerHTML=html;
  const act={ new:newLibrary, open:openFile, save:saveCurrent, json:saveAs, bibfile:downloadBib, bibclip:copyBib, draft:downloadDraft };
  exportMenu.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>{ closeMenus(); act[b.dataset.x](); });
}
document.getElementById("btnExport").onclick=e=>{ e.stopPropagation(); exportOwner="btnExport"; toggleMenu(exportMenu,"btnExport",()=>renderExportMenu(false)); };
document.getElementById("btnFile").onclick=e=>{ e.stopPropagation(); exportOwner="btnFile"; toggleMenu(exportMenu,"btnFile",()=>renderExportMenu(true)); };

/* ---- Add menu ---- */
function renderAddMenu(){
  addMenu.innerHTML='<h4>Add papers</h4>'
    +menuItem('data-add="manual"',"edit","Enter a paper","Type the details or fetch them by DOI")
    +menuItem('data-add="bib"',"import","Paste BibLaTeX","Import many at once from Zotero")
    +'<div class="divider"></div>'
    +menuItem('data-add="auto"',"sync","Find citation links","Looks up reference lists on OpenAlex; needs DOIs or arXiv IDs");
  addMenu.querySelector('[data-add="manual"]').onclick=()=>{ closeMenus(); openPaperModal(null); };
  addMenu.querySelector('[data-add="bib"]').onclick=()=>{ closeMenus(); openBib(); };
  addMenu.querySelector('[data-add="auto"]').onclick=()=>{ closeMenus(); runAutoLink(); };
}
document.getElementById("btnAdd").onclick=e=>{ e.stopPropagation(); toggleMenu(addMenu,"btnAdd",renderAddMenu); };

document.addEventListener("pointerdown",e=>{
  for(const [m,b] of MENUS){
    if(!m.classList.contains("open")) continue;
    const owner= m===exportMenu? document.getElementById(exportOwner) : document.getElementById(b);
    if(!m.contains(e.target) && !(owner && owner.contains(e.target))){ m.classList.remove("open"); if(owner){ owner.setAttribute("aria-expanded","false"); owner.classList.remove("on"); } }
  }
});
window.addEventListener("resize",()=>{ for(const [m,b] of MENUS){ if(m.classList.contains("open")){ if(m.classList.contains("pop")) positionPop(m, m===infoPop?infoBtn:legendBtn); else positionMenu(m, m===exportMenu?exportOwner:b); } } });

/* ---- Canvas popovers: colour legend and help ---- */
function positionPop(pop,btn){ const wrap=document.getElementById("graphWrap").getBoundingClientRect(); const r=btn.getBoundingClientRect();
  const left=Math.max(8,Math.min(r.left-wrap.left, wrap.width-pop.offsetWidth-8));
  pop.style.left=left+"px"; pop.style.top=Math.max(8, r.top-wrap.top-pop.offsetHeight-8)+"px"; }
function togglePop(pop,btn,render){
  const willOpen=!pop.classList.contains("open");
  closeMenus(willOpen?pop:null);
  if(!willOpen){ pop.classList.remove("open"); btn.classList.remove("on"); return; }
  render(); hydrateIcons(pop); pop.classList.add("open"); btn.classList.add("on"); positionPop(pop,btn);
}
function legendTagGuess(c){
  const cnt=new Map();
  for(const p of state.papers){ if(p.color===c) for(const t of (p.tags||[])) cnt.set(t,(cnt.get(t)||0)+1); }
  let best=null,bn=0; for(const [t,n] of cnt){ if(n>bn){bn=n;best=t;} }
  return best;
}
function renderLegend(){
  const counts=new Map();
  for(const p of state.papers){ if(p.color) counts.set(p.color,(counts.get(p.color)||0)+1); }
  const rows=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
  let html='<h4>Colour legend</h4>';
  if(!rows.length) html+='<p class="note" style="max-width:240px">No colours assigned yet. Pick one in a paper\'s Colour section, then name it here.</p>';
  for(const [c,n] of rows){
    html+=`<div class="legend-row">
      <button class="sw" data-lgf="${esc(c)}" aria-pressed="${colorFilter===c}" title="Show only these papers" style="background:${esc(c)}"></button>
      <input data-lgn="${esc(c)}" placeholder="${esc(legendTagGuess(c)||"Name this colour")}" value="${esc(legendNames[c]||"")}" aria-label="Name for this colour">
      <span class="n">${n}</span></div>`;
  }
  if(rows.length) html+= colorFilter? '<p class="note">Showing one colour. Click the swatch again or press <kbd>Esc</kbd> to show all.</p>'
                                    : '<p class="note">Click a swatch to show only those papers.</p>';
  legendPop.innerHTML=html;
  legendPop.querySelectorAll("[data-lgf]").forEach(b=>b.onclick=()=>{
    colorFilter= colorFilter===b.dataset.lgf? null : b.dataset.lgf; renderLegend(); positionPop(legendPop,legendBtn); requestDraw(); });
  legendPop.querySelectorAll("[data-lgn]").forEach(inp=>inp.addEventListener("input",()=>{
    const v=inp.value.trim(); if(v) legendNames[inp.dataset.lgn]=v; else delete legendNames[inp.dataset.lgn]; save(); }));
}
legendBtn.onclick=e=>{ e.stopPropagation(); togglePop(legendPop,legendBtn,renderLegend); };
const MOD=/Mac|iPhone|iPad/.test(navigator.platform||"")?"⌘":"Ctrl";
function renderInfo(){
  const key=(label,keys)=>`<div class="key-row"><span>${label}</span><span>${keys}</span></div>`;
  const k=s=>`<kbd>${s}</kbd>`;
  const mini=(style)=>`<i style="${style}"></i>`;
  infoPop.innerHTML=`<h4>Reading the network</h4>
    <div class="legend-line">${mini("width:26px;height:16px;border:1px solid #D9DFDC;border-left:4px solid #3E6FB0;border-radius:3px;background:#fff")}A paper, with its colour on the left edge</div>
    <div class="legend-line">${mini("width:26px;height:16px;border:1px solid #D9DFDC;border-left:4px solid #C9D1CD;border-radius:3px;background:#F7F9F8")}Pale: no notes written yet</div>
    <div class="legend-line">${mini("width:26px;height:2px;background:#55615C;position:relative")}Arrow from the citing paper to the cited one</div>
    <div class="legend-line">${mini("width:16px;height:16px;border-radius:50%;background:#3E6FB0;margin:0 5px")}Number on a paper: how often it is cited</div>
    <div class="legend-line">${mini("width:9px;height:9px;border-radius:50%;background:#1E6A50;margin:0 8px")}Read ${mini("width:9px;height:9px;border-radius:50%;background:#C3962A;margin-left:8px")}Skimmed</div>
    <div class="legend-line">${mini("width:26px;height:14px;background:#F2DF4B;border-radius:3px")}Search match or pinned link note</div>
    <div class="divider"></div>
    <h4>Mouse and keyboard</h4>
    ${key("Link two papers",k("Shift")+" + click, or "+k("L"))}
    ${key("Pin a link note",k("Alt")+" + click the arrow")}
    ${key("Select several",k(MOD)+" + drag or click")}
    ${key("Re-run the layout",k("A"))}
    ${key("Fit all papers in view",k("F"))}
    ${key("Show all link notes",k("T"))}
    ${key("Delete selection",k("Del"))}
    ${key("Undo, redo",k(MOD+"+Z")+" "+k(MOD+"+Y"))}
    ${key("Save",k(MOD+"+S"))}
    ${key("Cancel, clear selection",k("Esc"))}
    <div class="divider"></div>
    <p>Search matches titles, authors, notes and link notes. Start with <b>#</b> to filter by tag.</p>`;
}
infoBtn.onclick=e=>{ e.stopPropagation(); togglePop(infoPop,infoBtn,renderInfo); };

/* ============================ Responsive panel helpers ============================ */
function isNarrow(){ return window.innerWidth<=900; }
function setSideBtn(open){ const b=document.getElementById("btnSide"); b.setAttribute("aria-pressed",String(open)); b.title= open? "Hide the paper panel":"Show the paper panel"; }
function panelShow(){ document.getElementById("side").classList.remove("collapsed"); setSideBtn(true); setTimeout(resize,10); }
function panelHide(){ document.getElementById("side").classList.add("collapsed"); setSideBtn(false); setTimeout(resize,10); }

/* ============================ Toggles ============================ */
function setLabelsBtn(){ const b=document.getElementById("btnLabels"); b.setAttribute("aria-pressed",String(showLabels));
  b.title= showLabels? "Hide link notes except pinned ones (T)" : "Show all link notes (T)"; }
document.getElementById("btnLabels").onclick=()=>{ showLabels=!showLabels; setLabelsBtn(); save(); requestDraw(); };
function setShapeBtn(){ const b=document.getElementById("btnShape"); const dot=globalShape==="dot";
  b.querySelector(".ic").innerHTML=ic(dot?"dot":"card"); b.querySelector(".lbl").textContent= dot?"Circles":"Cards";
  b.title= dot? "Papers drawn as circles. Click to show cards with titles." : "Papers drawn as cards. Click to show compact circles."; }
document.getElementById("btnShape").onclick=()=>{ pushUndo(); globalShape= globalShape==="dot"?"card":"dot"; state.papers.forEach(p=>delete p.shape); setShapeBtn(); save(); renderSide(); requestDraw(); };

/* ============================ View ============================ */
function fit(){
  if(!state.papers.length){ view={x:0,y:0,scale:1}; requestDraw(); return; }
  let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
  for(const p of state.papers){ minx=Math.min(minx,p.x); maxx=Math.max(maxx,p.x); miny=Math.min(miny,p.y); maxy=Math.max(maxy,p.y); }
  const padW=CARDW+80, padH=CARDH+110; const gw=(maxx-minx)+padW, gh=(maxy-miny)+padH;
  view.scale=Math.min(1.4, Math.max(0.12, Math.min(W/gw, H/gh)));
  const cx=(minx+maxx)/2, cy=(miny+maxy)/2; view.x=-cx*view.scale; view.y=-cy*view.scale;
  requestDraw();
}
function zoomBy(f){ const sx=W/2, sy=H/2; const [wx,wy]=s2w(sx,sy);
  view.scale=Math.min(4,Math.max(0.12,view.scale*f)); const [nx,ny]=w2s(wx,wy); view.x+=sx-nx; view.y+=sy-ny; requestDraw(); }
document.getElementById("btnFit").onclick=fit;
document.getElementById("zoomIn").onclick=()=>zoomBy(1.25);
document.getElementById("zoomOut").onclick=()=>zoomBy(0.8);

/* ============================ Side panel ============================ */
function refLabel(p){ return (p.title||"Untitled")+(p.year?" ("+p.year+")":""); }
function goTo(id){ selId=id; selEdge=null; selSet.clear(); renderSide(); focusNode(id); requestDraw(); }
function bindGo(el){ el.querySelectorAll("[data-go]").forEach(s=>{ s.onclick=()=>goTo(s.dataset.go);
  s.onkeydown=ev=>{ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); goTo(s.dataset.go); } }; }); }
function refTitle(p,extra){ return `<span class="ref-title" data-go="${p.id}" role="link" tabindex="0">${esc(p.title||"Untitled")}${p.year?` <span class="ref-year">${esc(p.year)}</span>`:""}${extra||""}</span>`; }
const STATUS=[["toread","To read","toread"],["skimmed","Skimmed","skimmed"],["read","Read","read"]];
const EMPH=[["","Normal"],["hi","Glow"],["hero","Hero"],["low","Faded"]];
function statusSeg(cur,attr){ return `<div class="seg" role="group" aria-label="Reading status">${STATUS.map(([v,l,i])=>
  `<button class="st-${v}" ${attr}="${v}" aria-pressed="${cur===v}">${ic(i)}${l}</button>`).join("")}</div>`; }
function emphSeg(cur,attr){ return `<div class="seg" role="group" aria-label="Style" style="margin-top:10px">${EMPH.map(([v,l])=>
  `<button ${attr}="${v}" aria-pressed="${cur===v}">${l}</button>`).join("")}</div>`; }
function swatchRow(cur,attr,withCustom,p){
  return `<div class="swatches">${PALETTE.map(c=>`<button class="sw" ${attr}="${c}" aria-pressed="${(cur||"").toLowerCase()===c.toLowerCase()}" title="Use this colour" style="background:${c}"></button>`).join("")}
    ${withCustom?`<input type="color" class="sw-custom" id="colPick" value="${esc(p.color||colorFor(p))}" title="Pick any colour">`:""}
    <button class="sw-auto" ${attr}="" title="Automatic colour" aria-pressed="${!cur}">Auto</button></div>`; }

function renderStatsPanel(el){
  const N=state.papers.length, E=state.edges.length;
  const withNotes=state.papers.filter(p=>p.note&&p.note.trim()).length;
  const st={toread:0,skimmed:0,read:0};
  state.papers.forEach(p=>{ const k=p.status||"toread"; st[k]=(st[k]||0)+1; });
  const top=state.papers.map(p=>[p,inDegree(p.id)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const orph=state.papers.filter(p=>inDegree(p.id)===0&&outDegree(p.id)===0).slice(0,8);
  const tags=new Map(); state.papers.forEach(p=>(p.tags||[]).forEach(t=>tags.set(t,(tags.get(t)||0)+1)));
  const stat=(n,l)=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`;
  if(!N){ el.innerHTML=`<div class="p-head"><h2 class="p-title">${esc(libraryName()||"Untitled library")}</h2>
      <p class="p-meta">No papers yet.</p></div>
      <p class="help-text">Use <b>Add</b> in the toolbar to enter a paper or paste a BibLaTeX export. Selected papers show their notes and citations here.</p>`; return; }
  el.innerHTML=`<div class="p-head"><h2 class="p-title">${esc(libraryName()||"Untitled library")}</h2>
      <p class="p-meta">Select a paper to read and edit its notes.</p></div>
    <div class="section"><div class="stat-grid">${stat(N,"papers")}${stat(E,"links")}${stat(withNotes,"with notes")}</div></div>
    <div class="section"><h3>Reading progress</h3><div class="stat-grid">${stat(st.toread,"to read")}${stat(st.skimmed,"skimmed")}${stat(st.read,"read")}</div></div>
    ${tags.size?`<div class="section"><h3>Tags</h3><div class="tag-list">${[...tags.entries()].sort((a,b)=>b[1]-a[1]).map(([t,c])=>`<button class="tag" data-tag="${esc(t)}" title="Show papers tagged ${esc(t)}">${esc(t)} <span class="n">${c}</span></button>`).join("")}</div></div>`:""}
    ${top.length?`<div class="section"><h3>Most cited</h3><div class="refs">${top.map(([p,c])=>`<div class="ref simple"><div class="ref-top">${refTitle(p)}<span class="ref-year" title="Cited ${c} times">${c}×</span></div></div>`).join("")}</div></div>`:""}
    ${orph.length?`<div class="section"><h3>Not linked yet</h3><div class="refs">${orph.map(p=>`<div class="ref simple"><div class="ref-top">${refTitle(p)}</div></div>`).join("")}</div></div>`:""}
    <div class="section"><h3>Getting around</h3><ul class="tips">
      <li>Hold <kbd>Shift</kbd> and click two papers to link them.</li>
      <li><kbd>${MOD}</kbd> + drag selects several papers at once.</li>
      <li>The help button at the bottom left lists every shortcut.</li></ul></div>`;
  bindGo(el);
  el.querySelectorAll("[data-tag]").forEach(a=>a.onclick=()=>{ setSearch("#"+a.dataset.tag); });
}
function renderMultiPanel(el){
  const n=selSet.size;
  el.innerHTML=`<div class="p-head"><h2 class="p-title">${n} papers selected</h2>
      <p class="p-meta">Drag any of them to move the group. <kbd>Del</kbd> deletes, <kbd>Esc</kbd> clears the selection.</p></div>
    <div class="section"><h3>Add a tag to all</h3><div class="field-row"><input id="bulkTag" placeholder="Tag name"><button class="primary" id="bulkTagDo">Add tag</button></div></div>
    <div class="section"><h3>Reading status</h3>${statusSeg(null,"data-bst")}</div>
    <div class="section"><h3>Colour and style</h3>${swatchRow(null,"data-bcol",false)}${emphSeg(null,"data-bem")}</div>
    <div class="p-actions" style="margin-top:20px"><button id="bulkClear">Clear selection</button><button id="bulkDel" class="danger push">${ic("trash")}Delete ${n} papers</button></div>`;
  const each=f=>{ [...selSet].forEach(id=>{ const p=byId(id); if(p) f(p); }); save(); requestDraw(); };
  const tagIn=el.querySelector("#bulkTag");
  const addTag=()=>{ const t=tagIn.value.trim(); if(!t) return; pushUndo(); each(p=>{ p.tags=p.tags||[]; if(!p.tags.includes(t)) p.tags.push(t); }); toast(`Tagged ${n} papers with “${t}”`); renderSide(); };
  el.querySelector("#bulkTagDo").onclick=addTag; tagIn.onkeydown=ev=>{ if(ev.key==="Enter") addTag(); };
  el.querySelectorAll("[data-bst]").forEach(b=>b.onclick=()=>{ pushUndo(); each(p=>p.status=b.dataset.bst); renderSide(); });
  el.querySelectorAll("[data-bcol]").forEach(b=>b.onclick=()=>{ pushUndo(); each(p=>{ if(b.dataset.bcol) p.color=b.dataset.bcol; else delete p.color; }); renderSide(); });
  el.querySelectorAll("[data-bem]").forEach(b=>b.onclick=()=>{ pushUndo(); each(p=>{ if(b.dataset.bem) p.emph=b.dataset.bem; else delete p.emph; }); renderSide(); });
  el.querySelector("#bulkClear").onclick=()=>{ selSet.clear(); renderSide(); requestDraw(); };
  el.querySelector("#bulkDel").onclick=()=>{ pushUndo(); [...selSet].forEach(id=>deletePaper(id)); selSet.clear();
    save(); renderSide(); updateStats(); updateHint(); requestDraw(); toast(`Deleted ${n} papers. Press ${MOD}+Z to undo.`); };
}
function renderSide(){
  editSession=null;
  const el=document.getElementById("sideInner");
  if(selEdge){ renderEdgePanel(el); return; }
  if(selSet.size>1){ renderMultiPanel(el); return; }
  if(!selId){ renderStatsPanel(el); return; }
  const p=byId(selId); if(!p){ selId=null; renderSide(); return; }
  const cites=state.edges.filter(e=>e.from===p.id);
  const citedBy=state.edges.filter(e=>e.to===p.id);
  function connRow(e,otherId){ const o=byId(otherId); if(!o) return "";
    return `<div class="ref"><div class="ref-top">${refTitle(o)}
        <button class="x" data-unlink="${e.from}|${e.to}" title="Remove this link">${ic("x")}</button></div>
        <input class="rel" data-rel="${e.from}|${e.to}" placeholder="How is it used? For example: proves Lemma 2" value="${esc(e.label||"")}" aria-label="Link note"></div>`; }
  const meta=[p.year,p.venue].filter(Boolean).join(", ");
  const dot=effShape(p)==="dot";
  el.innerHTML=`
    <div class="p-head has-del">
      <button id="delBtn" class="danger icon-btn head-del" title="Delete this paper (Del)" aria-label="Delete this paper">${ic("trash")}</button>
      <h2 class="p-title">${esc(p.title||"Untitled")}</h2>
      <p class="p-authors">${esc(p.authors)||'<span class="muted">No authors</span>'}</p>
      ${meta?`<p class="p-meta">${esc(meta)}</p>`:""}
      ${p.doi?`<a href="#" class="p-doi" id="doiLink" title="Open in a new tab">${esc(p.doi)}${ic("external")}</a>`:""}
    </div>
    ${statusSeg(p.status||"toread","data-st")}
    <div class="p-actions">
      <button id="editBtn" title="Edit title, authors, year and DOI">${ic("edit")}Edit</button>
      <button id="linkFromHere" title="Draw a citation from this paper to another">${ic("link")}Link</button>
      <button id="focusBtn" aria-pressed="${focusId===p.id}" title="Fade everything more than two links away">${ic("focus")}Focus</button>
      <button id="shapeBtn" title="${dot?"Show this paper as a card":"Show this paper as a circle"}">${ic(dot?"card":"dot")}${dot?"Card":"Circle"}</button>
    </div>
    <div class="section"><h3><label for="noteArea">Notes</label></h3>
      <textarea id="noteArea" class="note-area" rows="6" placeholder="Key claim, method, result, why it matters">${esc(p.note)}</textarea></div>
    <div class="section"><h3><label for="tagsIn">Tags</label></h3><input id="tagsIn" placeholder="Separate tags with commas" value="${esc((p.tags||[]).join(", "))}"></div>
    <div class="section"><h3>Cites <span class="n">${cites.length}</span></h3>
      ${cites.length?`<div class="refs">${cites.map(e=>connRow(e,e.to)).join("")}</div>`:'<p class="empty">No outgoing links. Use Link to add one.</p>'}</div>
    <div class="section"><h3>Cited by <span class="n">${citedBy.length}</span></h3>
      ${citedBy.length?`<div class="refs">${citedBy.map(e=>connRow(e,e.from)).join("")}</div>`:'<p class="empty">Nothing in this library cites it yet.</p>'}</div>
    <div class="section"><h3>Colour and style</h3>${swatchRow(p.color,"data-col",true,p)}${emphSeg(p.emph||"","data-em")}</div>
    ${p.abstract?`<div class="section"><h3>Abstract</h3><p class="abstract">${esc(p.abstract)}</p></div>`:""}`;
  const note=el.querySelector("#noteArea");
  note.addEventListener("input",()=>{ editUndo("note:"+p.id); p.note=note.value; save(); requestDraw(); });
  el.querySelector("#editBtn").onclick=()=>openPaperModal(p);
  el.querySelector("#shapeBtn").onclick=()=>{ pushUndo(); p.shape= effShape(p)==="dot"?"card":"dot"; save(); renderSide(); requestDraw(); };
  el.querySelector("#delBtn").onclick=()=>{ const t=p.title; pushUndo(); deletePaper(p.id); save(); renderSide(); updateStats(); updateHint(); requestDraw(); toast(`Deleted “${t.length>40?t.slice(0,39)+"…":t}”. Press ${MOD}+Z to undo.`); };
  el.querySelector("#linkFromHere").onclick=()=>{ toggleLink(true); linkFirst=p.id; updateHint(); requestDraw(); if(isNarrow()) panelHide(); };
  el.querySelector("#focusBtn").onclick=()=>{ focusId= focusId===p.id? null : p.id; renderSide(); requestDraw(); };
  el.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{ pushUndo(); p.status=b.dataset.st; save(); renderSide(); requestDraw(); });
  const tagsIn=el.querySelector("#tagsIn");
  tagsIn.addEventListener("input",()=>{ editUndo("tags:"+p.id); p.tags=tagsIn.value.split(",").map(s=>s.trim()).filter(Boolean); save(); requestDraw(); });
  el.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>{ pushUndo();
    if(b.dataset.col) p.color=b.dataset.col; else delete p.color; save(); renderSide(); requestDraw(); });
  const colPick=el.querySelector("#colPick");
  colPick.addEventListener("input",()=>{ editUndo("col:"+p.id); p.color=colPick.value; save(); requestDraw(); });
  colPick.addEventListener("change",()=>renderSide());
  el.querySelectorAll("[data-em]").forEach(b=>b.onclick=()=>{ pushUndo();
    if(b.dataset.em) p.emph=b.dataset.em; else delete p.emph; save(); renderSide(); requestDraw(); });
  const dl=el.querySelector("#doiLink"); if(dl) dl.onclick=ev=>{ ev.preventDefault(); openDoi(p.doi); };
  bindGo(el);
  el.querySelectorAll("[data-unlink]").forEach(b=>b.onclick=()=>{ const a=b.dataset.unlink.split("|"); pushUndo(); removeEdge(a[0],a[1]); save(); renderSide(); updateStats(); requestDraw(); });
  el.querySelectorAll("[data-rel]").forEach(inp=>inp.addEventListener("input",()=>{ const a=inp.dataset.rel.split("|"); const e=findEdge(a[0],a[1]); if(e){ editUndo("rel:"+inp.dataset.rel); e.label=inp.value; save(); requestDraw(); } }));
}
function renderEdgePanel(el){
  const e=findEdge(selEdge.from,selEdge.to); if(!e){ selEdge=null; renderSide(); return; }
  const a=byId(e.from), b=byId(e.to);
  el.innerHTML=`<div class="p-head"><h2 class="p-title">Citation link</h2></div>
    <div class="refs">
      <div class="ref simple"><div class="ref-top">${refTitle(a)}</div></div>
      <div class="cites-arrow">${ic("arrowDown")}cites</div>
      <div class="ref simple"><div class="ref-top">${refTitle(b)}</div></div>
    </div>
    <div class="section"><h3><label for="relArea">How is it used?</label></h3>
      <textarea id="relArea" class="note-area" rows="4" placeholder="For example: ${esc(firstAuthor(a)||"A")} uses the bound proven by ${esc(firstAuthor(b)||"B")} to …">${esc(e.label)}</textarea></div>
    <div class="p-actions">
      <button id="pinBtn" aria-pressed="${!!e.pin}" title="Keep this note visible when link notes are hidden">${ic("pin")}${e.pin?"Pinned":"Pin note"}</button>
      <button id="delEdge" class="danger push">${ic("trash")}Delete link</button></div>
    <p class="help-text" style="margin-top:8px">Pinned notes stay visible while the other link notes are hidden. Shortcut: <kbd>Alt</kbd> + click the arrow.</p>`;
  const ta=el.querySelector("#relArea"); ta.addEventListener("input",()=>{ editUndo("rel:"+e.from+"|"+e.to); e.label=ta.value; save(); requestDraw(); });
  el.querySelector("#pinBtn").onclick=()=>{ pushUndo(); e.pin=!e.pin; save(); renderSide(); requestDraw(); };
  bindGo(el);
  el.querySelector("#delEdge").onclick=()=>{ pushUndo(); removeEdge(e.from,e.to); selEdge=null; save(); renderSide(); updateStats(); requestDraw(); };
}
function focusNode(id){ const p=byId(id); if(!p) return; const [sx,sy]=w2s(p.x,p.y); view.x+=W/2-sx; view.y+=H/2-sy; requestDraw(); }
function openDoi(d){ let url=d;
  if(/^10\./.test(d)) url="https://doi.org/"+d;
  else if(/^arXiv:/i.test(d)) url="https://arxiv.org/abs/"+d.replace(/^arXiv:/i,"");
  else if(!/^https?:/i.test(d)) return;
  window.open(url,"_blank","noopener"); }

/* ============================ Hint, empty state, link mode ============================ */
function updateHint(){
  const h=document.getElementById("hint"), empty=document.getElementById("empty");
  const none=!state.papers.length;
  empty.hidden=!none;
  if(linkMode||shiftDown){ cv.classList.add("linking"); h.hidden=false;
    h.innerHTML= linkFirst? `Now click the paper it <b>cites</b>. <kbd>Esc</kbd> cancels.`
      : `<b>Link mode.</b> Click the citing paper first.`;
  } else { cv.classList.remove("linking"); h.hidden=true; }
}
function setLinkBtn(){ document.getElementById("btnLink").setAttribute("aria-pressed",String(linkMode||shiftDown)); }
function toggleLink(on){ linkMode= on==null? !linkMode : on; if(!linkMode) linkFirst=null; setLinkBtn(); updateHint(); requestDraw(); }
document.getElementById("btnLink").onclick=()=>toggleLink();
document.querySelectorAll("[data-empty]").forEach(b=>b.onclick=()=>{ const a=b.dataset.empty;
  if(a==="manual") openPaperModal(null); else if(a==="bib") openBib(); else openFile(); });

/* ============================ Search ============================ */
const searchIn=document.getElementById("search");
function setSearch(q){ searchIn.value=q; searchQ=q.trim(); searchIn.closest(".searchbox").classList.toggle("has-q",!!searchQ); requestDraw(); }
searchIn.addEventListener("input",()=>setSearch(searchIn.value));
searchIn.addEventListener("keydown",e=>{ if(e.key==="Escape"){ setSearch(""); searchIn.blur(); } });

/* ============================ Keyboard ============================ */
function isTyping(e){ const t=(e.target.tagName||""); return t==="INPUT"||t==="TEXTAREA"||e.target.isContentEditable; }
function anyModalOpen(){ return !!document.querySelector(".modal.open"); }
window.addEventListener("keydown",e=>{
  const mod=e.ctrlKey||e.metaKey, k=(e.key||"").toLowerCase();
  if(mod && k==="s"){ saveCurrent(); e.preventDefault(); return; }
  if(e.key==="Shift" && !shiftDown && !isTyping(e)){ shiftDown=true; setLinkBtn(); updateHint(); }
  if(e.key==="Escape"){
    const hadMenu=MENUS.some(([m])=>m.classList.contains("open"));
    closeMenus();
    if(anyModalOpen()){ closeAllModals(); return; }
    if(hadMenu) return;
    if(colorFilter){ colorFilter=null; if(legendPop.classList.contains("open")) renderLegend(); requestDraw(); return; }
    if(linkFirst){ linkFirst=null; updateHint(); requestDraw(); return; }
    if(linkMode){ toggleLink(false); return; }
    hideTip();
    if(focusId){ focusId=null; renderSide(); requestDraw(); return; }
    if(selSet.size){ selSet.clear(); renderSide(); requestDraw(); return; }
    if(!isTyping(e) && isNarrow()) panelHide();
    return;
  }
  if(isTyping(e) || anyModalOpen()) return;
  if(e.key==="Delete"||e.key==="Backspace"){
    if(selSet.size){ const n=selSet.size; pushUndo(); [...selSet].forEach(id=>deletePaper(id)); selSet.clear();
      save(); renderSide(); updateStats(); updateHint(); requestDraw(); e.preventDefault(); toast(`Deleted ${n} papers. Press ${MOD}+Z to undo.`); }
    else if(selId){ pushUndo(); deletePaper(selId); save(); renderSide(); updateStats(); updateHint(); requestDraw(); e.preventDefault(); }
    else if(selEdge){ pushUndo(); removeEdge(selEdge.from,selEdge.to); selEdge=null; save(); renderSide(); updateStats(); requestDraw(); e.preventDefault(); }
    return;
  }
  if(mod && k==="z" && !e.shiftKey){ undo(); e.preventDefault(); return; }
  if(mod && (k==="y" || (e.shiftKey && k==="z"))){ redo(); e.preventDefault(); return; }
  if(mod || e.altKey) return;
  if(k==="l"){ toggleLink(); }
  else if(k==="a"){ arrange(); }
  else if(k==="f"){ fit(); }
  else if(k==="t"){ showLabels=!showLabels; setLabelsBtn(); save(); requestDraw(); }
  else if(k==="/"){ searchIn.focus(); e.preventDefault(); }
});
window.addEventListener("keyup",e=>{ if(e.key==="Shift"){ shiftDown=false; if(!linkMode) linkFirst=null; setLinkBtn(); updateHint(); requestDraw(); } });
window.addEventListener("blur",()=>{ if(shiftDown){ shiftDown=false; if(!linkMode) linkFirst=null; setLinkBtn(); updateHint(); } });

/* ============================ Modals ============================ */
let lastFocus=null;
function openModal(id){ lastFocus=document.activeElement; closeMenus(); document.getElementById(id).classList.add("open"); }
function closeModal(id){ const m=document.getElementById(id); if(!m.classList.contains("open")) return; m.classList.remove("open");
  if(m._resolve){ const r=m._resolve; m._resolve=null; r("cancel"); }
  if(lastFocus && lastFocus.focus) try{ lastFocus.focus(); }catch(e){} }
function closeAllModals(){ document.querySelectorAll(".modal.open").forEach(m=>closeModal(m.id)); }
function ask(message,buttons,title){
  return new Promise(res=>{
    const m=document.getElementById("confirmModal");
    document.getElementById("confirmTitle").textContent=title||"Are you sure?";
    document.getElementById("confirmMsg").textContent=message;
    const row=document.getElementById("confirmBtns"); row.innerHTML="";
    let primaryBtn=null;
    for(const b of buttons){ const btn=document.createElement("button"); btn.textContent=b.label;
      if(b.primary){ btn.className="primary"; primaryBtn=btn; } else if(b.danger) btn.className="danger";
      btn.onclick=()=>{ m._resolve=null; closeModal("confirmModal"); res(b.id); }; row.appendChild(btn); }
    m._resolve=res; openModal("confirmModal"); setTimeout(()=>(primaryBtn||row.lastChild).focus(),20);
  });
}
window.closeModal=closeModal;
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("mousedown",e=>{ if(e.target===m) closeModal(m.id); }));

function openBib(){ document.getElementById("bibText").value=""; document.getElementById("bibCount").textContent=""; openModal("bibModal");
  setTimeout(()=>document.getElementById("bibText").focus(),30); }
document.getElementById("bibText").addEventListener("input",function(){
  try{ const n=parseBib(this.value).length; document.getElementById("bibCount").textContent= n?`${n} entr${n===1?"y":"ies"} found`:""; }catch(e){} });
const normDoi=d=>String(d||"").trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//,"").replace(/^doi:\s*/,"");
document.getElementById("bibDo").onclick=()=>{
  const entries=parseBib(document.getElementById("bibText").value);
  if(!entries.length){ toast("No BibLaTeX entries found. Entries start with @article{, @book{ and so on."); return; }
  pushUndo();
  const keys=new Set(state.papers.map(p=>p.key).filter(Boolean));
  const dois=new Set(state.papers.map(p=>normDoi(p.doi)).filter(Boolean));
  let added=0,skipped=0; const fresh=[];
  for(const e of entries){
    const cand=entryToPaper(e), nd=normDoi(cand.doi);
    if((e.key && keys.has(e.key)) || (nd && dois.has(nd))){ skipped++; continue; }
    const np=addPaper(cand); fresh.push(np);
    if(e.key) keys.add(e.key); if(nd) dois.add(nd); added++;
  }
  const wasEmpty=state.papers.length===fresh.length;
  if(wasEmpty) fit(); placeNewInCorner(fresh); if(wasEmpty) fit();
  save(); renderSide(); updateStats(); updateHint(); closeModal("bibModal"); requestDraw();
  toast(`Added ${added} paper${added===1?"":"s"}${skipped?`, skipped ${skipped} already in the library`:""}`);
};
let editing=null;
function placeNewInCorner(fresh){
  if(!fresh.length) return;
  const stepX=CARDW+40, stepY=CARDH+34;
  const corner=s2w(50,50);
  const cols=Math.max(1, Math.floor((W-100)/(stepX*view.scale)));
  const existing=state.papers.filter(p=>fresh.indexOf(p)<0);
  const occ=(x,y)=> existing.some(p=>Math.abs(p.x-x)<stepX*0.85 && Math.abs(p.y-y)<stepY*0.85);
  let cell=0;
  for(const p of fresh){ let x,y;
    do{ const c=cell%cols, r=Math.floor(cell/cols); x=corner[0]+c*stepX; y=corner[1]+r*stepY; cell++; } while(occ(x,y) && cell<5000);
    p.x=x; p.y=y; }
}
function openPaperModal(p){ editing=p;
  document.getElementById("paperModalTitle").textContent= p?"Edit paper":"Add paper";
  document.getElementById("paperDo").textContent= p?"Save changes":"Add paper";
  document.getElementById("pTitle").value=p?p.title:""; document.getElementById("pAuthors").value=p?p.authors:"";
  document.getElementById("pYear").value=p?p.year:""; document.getElementById("pVenue").value=p?p.venue:"";
  document.getElementById("pDoi").value=p?p.doi:""; document.getElementById("pNote").value=p?p.note:"";
  openModal("paperModal"); setTimeout(()=>document.getElementById(p?"pTitle":"pDoi").focus(),30); }
document.getElementById("paperDo").onclick=()=>{
  const data={ title:document.getElementById("pTitle").value.trim()||"Untitled",
    authors:document.getElementById("pAuthors").value.trim(), year:document.getElementById("pYear").value.trim(),
    venue:document.getElementById("pVenue").value.trim(), doi:document.getElementById("pDoi").value.trim(),
    note:document.getElementById("pNote").value };
  pushUndo();
  if(editing){ Object.assign(editing,data); }
  else { const p=addPaper(Object.assign({key:"",abstract:""},data)); selId=p.id; selEdge=null; selSet.clear(); const c=s2w(W/2,H/2); p.x=c[0]; p.y=c[1]; if(isNarrow()) panelShow(); }
  save(); renderSide(); updateStats(); updateHint(); closeModal("paperModal"); requestDraw(); };
document.getElementById("paperModal").addEventListener("keydown",e=>{ if(e.key==="Enter" && e.target.tagName==="INPUT"){ e.preventDefault(); document.getElementById("paperDo").click(); } });
