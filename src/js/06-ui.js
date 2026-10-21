
/* ============================ Menus ============================ */
const layoutMenu=document.getElementById("layoutMenu");
const exportMenu=document.getElementById("exportMenu");
function renderLayoutMenu(){
  let html='<h4>Auto layouts — click to try</h4>';
  for(const L of LAYOUTS){ html+=`<button class="item" data-lay="${L.id}">${L.id===lastLayout?"● ":""}${L.name} <small>— ${L.desc}</small></button>`; }
  html+=`<div class="ctl"><label>Edge bundling — circle layout (β = <span id="bsVal">${bundleStrength.toFixed(2)}</span>)</label>
    <input type="range" id="bsSlider" min="0" max="1" step="0.05" value="${bundleStrength}"></div>`;
  html+=`<div class="ctl"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="cbTag" ${colorByTag?"checked":""}> Colour nodes by first tag</label></div>`;
  html+=`<div class="ctl"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="cbSnap" ${snapOn?"checked":""}> Snap while dragging <small>— hold Ctrl to bypass</small></label></div>`;
  html+='<div class="divider"></div><h4>Saved layouts</h4>';
  if(bookmarks.length){ bookmarks.forEach((b,i)=>{
    html+=`<div class="bm"><span class="nm" data-bm="${i}" title="Restore this layout">★ ${esc(b.name)}</span><button data-bmdel="${i}" title="Delete">✕</button></div>`; }); }
  else { html+='<div class="meta" style="margin:0 8px 4px">None yet — arrange or drag papers, then save.</div>'; }
  html+='<div class="saverow"><input id="bmName" placeholder="Name current layout…"><button class="primary" id="bmSave">Save</button></div>';
  layoutMenu.innerHTML=html;
  layoutMenu.querySelectorAll("[data-lay]").forEach(b=>b.onclick=()=>{ runLayout(b.dataset.lay); });
  const bs=layoutMenu.querySelector("#bsSlider");
  bs.oninput=()=>{ bundleStrength=parseFloat(bs.value); const v=layoutMenu.querySelector("#bsVal"); if(v) v.textContent=bundleStrength.toFixed(2); save(); requestDraw(); };
  const cbT=layoutMenu.querySelector("#cbTag");
  cbT.onchange=()=>{ colorByTag=cbT.checked; save(); requestDraw(); };
  const cbS=layoutMenu.querySelector("#cbSnap");
  cbS.onchange=()=>{ snapOn=cbS.checked; save(); };
  layoutMenu.querySelectorAll("[data-bm]").forEach(b=>b.onclick=()=>{ restoreBookmark(+b.dataset.bm); });
  layoutMenu.querySelectorAll("[data-bmdel]").forEach(b=>b.onclick=()=>{ deleteBookmark(+b.dataset.bmdel); });
  layoutMenu.querySelector("#bmSave").onclick=()=>{ const inp=layoutMenu.querySelector("#bmName"); saveBookmark(inp.value); };
  const inp=layoutMenu.querySelector("#bmName"); if(inp) inp.onkeydown=ev=>{ if(ev.key==="Enter"){ saveBookmark(inp.value); } };
}
function positionMenu(menu,btnId){ const r=document.getElementById(btnId).getBoundingClientRect();
  menu.style.left=Math.min(r.left,window.innerWidth-270)+"px"; menu.style.top=(r.bottom+6)+"px"; }
document.getElementById("btnLayout").onclick=e=>{ e.stopPropagation(); exportMenu.classList.remove("open");
  const open=layoutMenu.classList.toggle("open"); if(open){ renderLayoutMenu(); positionMenu(layoutMenu,"btnLayout"); } };
function renderExportMenu(){
  exportMenu.innerHTML=`<h4>Export</h4>
    <button class="item" data-x="json">💾 Save As… / JSON backup</button>
    <button class="item" data-x="bibfile">📚 BibLaTeX → file <small>— .bib</small></button>
    <button class="item" data-x="bibclip">📋 BibLaTeX → clipboard</button>
    <button class="item" data-x="draft">📝 Related-work draft <small>— .md, grouped by tag</small></button>`;
  exportMenu.querySelector('[data-x="json"]').onclick=()=>{ saveAs(); exportMenu.classList.remove("open"); };
  exportMenu.querySelector('[data-x="bibfile"]').onclick=()=>{ downloadBib(); exportMenu.classList.remove("open"); };
  exportMenu.querySelector('[data-x="bibclip"]').onclick=()=>{ copyBib(); exportMenu.classList.remove("open"); };
  exportMenu.querySelector('[data-x="draft"]').onclick=()=>{ downloadDraft(); exportMenu.classList.remove("open"); };
}
document.getElementById("btnExport").onclick=e=>{ e.stopPropagation(); layoutMenu.classList.remove("open");
  const open=exportMenu.classList.toggle("open"); if(open){ renderExportMenu(); positionMenu(exportMenu,"btnExport"); } };
document.addEventListener("mousedown",e=>{
  if(layoutMenu.classList.contains("open") && !layoutMenu.contains(e.target) && e.target.id!=="btnLayout") layoutMenu.classList.remove("open");
  if(exportMenu.classList.contains("open") && !exportMenu.contains(e.target) && e.target.id!=="btnExport") exportMenu.classList.remove("open");
  if(infoPop.classList.contains("open") && !infoPop.contains(e.target) && e.target.id!=="infoBtn") infoPop.classList.remove("open");
  if(addMenu.classList.contains("open") && !addMenu.contains(e.target) && e.target.id!=="btnAdd") addMenu.classList.remove("open");
});
const infoBtn=document.getElementById("infoBtn"), infoPop=document.getElementById("infoPop");
const legendBtn=document.getElementById("legendBtn"), legendPop=document.getElementById("legendPop");
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
  if(!rows.length) html+='<div class="meta" style="margin:0 8px 8px;max-width:220px">No manual colours yet — assign them in a paper\'s "Colour &amp; style" section.</div>';
  for(const [c,n] of rows){
    html+=`<div style="display:flex;align-items:center;gap:8px;padding:3px 8px">
      <button data-lgf="${esc(c)}" title="Show only these papers" style="width:20px;height:20px;flex:none;border-radius:6px;background:${esc(c)};padding:0;border:${colorFilter===c?"2px solid #232a40":"1px solid rgba(0,0,0,.15)"}"></button>
      <input data-lgn="${esc(c)}" placeholder="${esc(legendTagGuess(c)||"name this colour…")}" value="${esc(legendNames[c]||"")}" style="flex:1;font-size:12px;padding:4px 6px;min-width:130px">
      <span class="meta" style="flex:none">${n}</span></div>`;
  }
  html+= colorFilter? '<div class="meta" style="margin:6px 8px">Filtering — click the swatch again or press <kbd>Esc</kbd> to clear.</div>'
                    : '<div class="meta" style="margin:6px 8px">Click a swatch to spotlight that group.</div>';
  legendPop.innerHTML=html;
  legendPop.querySelectorAll("[data-lgf]").forEach(b=>b.onclick=()=>{
    colorFilter= colorFilter===b.dataset.lgf? null : b.dataset.lgf; renderLegend(); positionLegend(); requestDraw(); });
  legendPop.querySelectorAll("[data-lgn]").forEach(inp=>inp.addEventListener("input",()=>{
    const v=inp.value.trim(); if(v) legendNames[inp.dataset.lgn]=v; else delete legendNames[inp.dataset.lgn]; save(); }));
}
function positionLegend(){ const r=legendBtn.getBoundingClientRect();
  legendPop.style.left=r.left+"px"; legendPop.style.top=Math.max(8, r.top-legendPop.offsetHeight-8)+"px"; }
legendBtn.onclick=e=>{ e.stopPropagation(); infoPop.classList.remove("open"); layoutMenu.classList.remove("open"); exportMenu.classList.remove("open"); addMenu.classList.remove("open");
  legendBtn.classList.toggle("active", legendPop.classList.toggle("open"));
  if(legendPop.classList.contains("open")){ renderLegend(); positionLegend(); } };
window.addEventListener("resize",()=>{ if(legendPop.classList.contains("open")) positionLegend(); });
function renderInfo(){ infoPop.innerHTML=`<h4>Legend</h4>
  <div class="row"><span class="sw" style="background:#fff;border-left:5px solid var(--accent)"></span>Card / circle = a paper · colour = its hue</div>
  <div class="row"><span class="sw" style="background:#f3f6fd;border-left:5px solid #c7d0e6"></span>Faded = no notes yet</div>
  <div class="row">↘ arrow = <b style="color:var(--ink)">cites</b> · badge = times cited · glow = highlighted · header-bar card = hero</div>
  <h4>Tips</h4>
  <div class="t">🔎 Search matches titles, authors <b>and notes</b> — hits glow green.</div>
  <div class="t">Hold <kbd>Shift</kbd> + click two papers to link · <kbd>Alt</kbd>-click an arrow to pin its label.</div>
  <div class="t"><kbd>Layout ▾</kbd> for layouts, edge-bundling & saved layouts · drag to arrange · scroll / pinch to zoom.</div>
  <div class="t"><kbd>Open</kbd>/<kbd>Save</kbd> edits a .json directly · a dot on 💾 = unsaved changes.</div>
  <h4>Keyboard shortcuts</h4>
  <div class="t"><kbd>L</kbd> link · <kbd>A</kbd> arrange · <kbd>F</kbd> fit · <kbd>T</kbd> labels · <kbd>Del</kbd> delete</div>
  <div class="t"><kbd>Ctrl/⌘+Z</kbd> undo · <kbd>Ctrl/⌘+Y</kbd> redo · <kbd>Ctrl/⌘+S</kbd> save · <kbd>Esc</kbd> dismiss</div>
  <div class="t"><kbd>Ctrl</kbd>+drag = multi-select · search <b>#tag</b> · 🎯 Focus dims non-neighbours · 🔍 Auto-link in ＋ Add.</div>
  <div class="t">Nodes snap to the grid & to each other while dragging — hold <kbd>Ctrl</kbd> to bypass, toggle in Layout ▾. Undo covers moves & edits too.</div>`; }
infoBtn.onclick=e=>{ e.stopPropagation(); layoutMenu.classList.remove("open"); exportMenu.classList.remove("open");
  const open=infoPop.classList.toggle("open"); if(open){ renderInfo(); const r=infoBtn.getBoundingClientRect();
    infoPop.style.left=r.left+"px"; infoPop.style.top=Math.max(8, r.top-infoPop.offsetHeight-8)+"px"; } };
document.addEventListener("touchstart",e=>{ if(infoPop.classList.contains("open") && !infoPop.contains(e.target) && e.target.id!=="infoBtn") infoPop.classList.remove("open"); },{passive:true});

/* ============================ Responsive panel helpers ============================ */
function isNarrow(){ return window.innerWidth<=900; }
function panelShow(){ const s=document.getElementById("side"); s.classList.remove("collapsed"); document.getElementById("btnSide").textContent="⮜"; setTimeout(resize,10); }
function panelHide(){ const s=document.getElementById("side"); s.classList.add("collapsed"); document.getElementById("btnSide").textContent="⮞"; setTimeout(resize,10); }
/* ============================ Labels / Shape toggles ============================ */
function setLabelsBtn(){ const b=document.getElementById("btnLabels"); b.classList.toggle("active",showLabels); const l=b.querySelector(".lbl"); if(l) l.textContent= showLabels?"Labels on":"Labels"; }
document.getElementById("btnLabels").onclick=()=>{ showLabels=!showLabels; setLabelsBtn(); save(); requestDraw(); };
function setShapeBtn(){ const b=document.getElementById("btnShape"); const ic=b.querySelector(".ic"), l=b.querySelector(".lbl"); if(ic) ic.textContent= globalShape==="dot"?"◯":"▭"; if(l) l.textContent= globalShape==="dot"?"Circles":"Cards"; }
document.getElementById("btnShape").onclick=()=>{ pushUndo(); globalShape= globalShape==="dot"?"card":"dot"; state.papers.forEach(p=>delete p.shape); setShapeBtn(); save(); requestDraw(); };

/* ============================ Fit ============================ */
function fit(){
  if(!state.papers.length){ view={x:0,y:0,scale:1}; return; }
  let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
  for(const p of state.papers){ minx=Math.min(minx,p.x); maxx=Math.max(maxx,p.x); miny=Math.min(miny,p.y); maxy=Math.max(maxy,p.y); }
  const padW=CARDW+80, padH=CARDH+80; const gw=(maxx-minx)+padW, gh=(maxy-miny)+padH;
  view.scale=Math.min(1.4, Math.max(0.12, Math.min(W/gw, H/gh)));
  const cx=(minx+maxx)/2, cy=(miny+maxy)/2; view.x=-cx*view.scale; view.y=-cy*view.scale;
  requestDraw();
}
document.getElementById("btnFit").onclick=fit;

/* ============================ Side panel ============================ */
function refLabel(p){ return (p.title||"Untitled")+(p.year?" ("+p.year+")":""); }
function renderStatsPanel(el){
  const N=state.papers.length, E=state.edges.length;
  const withNotes=state.papers.filter(p=>p.note&&p.note.trim()).length;
  const st={toread:0,skimmed:0,read:0};
  state.papers.forEach(p=>{ const k=p.status||"toread"; st[k]=(st[k]||0)+1; });
  const top=state.papers.map(p=>[p,inDegree(p.id)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const orph=state.papers.filter(p=>inDegree(p.id)===0&&outDegree(p.id)===0).slice(0,8);
  const tags=new Map(); state.papers.forEach(p=>(p.tags||[]).forEach(t=>tags.set(t,(tags.get(t)||0)+1)));
  el.innerHTML=`<p class="empty">Select a paper to read its notes — or explore the library:</p>
    <div class="section"><h3>Library</h3><p class="meta">${N} papers · ${E} links · notes on ${withNotes}/${N}<br>📕 ${st.toread} to read · 📖 ${st.skimmed} skimmed · ✅ ${st.read} read</p></div>
    ${tags.size?`<div class="section"><h3>Tags</h3><p class="meta">${[...tags.entries()].sort((a,b)=>b[1]-a[1]).map(([t,c])=>`<a href="#" data-tag="${esc(t)}">#${esc(t)}</a> (${c})`).join(" · ")}</p></div>`:""}
    ${top.length?`<div class="section"><h3>Most cited</h3>${top.map(([p,c])=>`<div class="refitem"><span class="lbl" data-go="${p.id}">${esc(refLabel(p))} — ${c}×</span></div>`).join("")}</div>`:""}
    ${orph.length?`<div class="section"><h3>Unconnected</h3>${orph.map(p=>`<div class="refitem"><span class="lbl" data-go="${p.id}">${esc(refLabel(p))}</span></div>`).join("")}</div>`:""}
    <div class="section"><h3>Tips</h3><p class="meta">
    • <kbd>Ctrl</kbd>+drag empty space selects several papers; <kbd>Ctrl</kbd>+click adds/removes one.<br>
    • Search <b>#tag</b> filters by tag · 🎯 Focus dims everything beyond a paper's neighbourhood.<br>
    • <kbd>＋ Add ▾</kbd> → 🔍 Auto-link draws citation links automatically via OpenAlex (needs DOIs).</p></div>`;
  el.querySelectorAll("[data-go]").forEach(s=>s.onclick=()=>{ selId=s.dataset.go; selEdge=null; renderSide(); focusNode(selId); requestDraw(); });
  el.querySelectorAll("[data-tag]").forEach(a=>a.onclick=ev=>{ ev.preventDefault();
    const si=document.getElementById("search"); si.value="#"+a.dataset.tag; searchQ=si.value; requestDraw(); });
}
function renderMultiPanel(el){
  el.innerHTML=`<h2>${selSet.size} papers selected</h2>
    <p class="meta">Drag any selected paper to move the whole group. <kbd>Del</kbd> deletes all · <kbd>Esc</kbd> clears.</p>
    <div class="section"><h3>Add tag to all</h3><div style="display:flex;gap:6px"><input id="bulkTag" placeholder="tag name" style="flex:1"><button class="primary" id="bulkTagDo">Add</button></div></div>
    <div class="section"><h3>Set status</h3><div style="display:flex;gap:4px">
      <button data-bst="toread" style="flex:1">📕 To read</button>
      <button data-bst="skimmed" style="flex:1">📖 Skimmed</button>
      <button data-bst="read" style="flex:1">✅ Read</button></div></div>
    <div class="section"><h3>Colour</h3><div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
      ${PALETTE.map(c=>`<button data-bcol="${c}" style="background:${c};width:22px;height:22px;border-radius:6px;padding:0;border:1px solid rgba(0,0,0,.15)"></button>`).join("")}
      <button data-bcol="" style="font-size:11px;padding:3px 8px">Auto</button></div></div>
    <div class="section"><h3>Style</h3><div style="display:flex;gap:4px">
      <button data-bem="" style="flex:1;font-size:12px">Normal</button>
      <button data-bem="hi" style="flex:1;font-size:12px">✨ Glow</button>
      <button data-bem="hero" style="flex:1;font-size:12px">🌟 Hero</button>
      <button data-bem="low" style="flex:1;font-size:12px">Faded</button></div></div>
    <div style="display:flex;gap:6px;margin-top:10px"><button id="bulkClear">Clear selection</button><button id="bulkDel" style="margin-left:auto">Delete all</button></div>`;
  const each=f=>{ [...selSet].forEach(id=>{ const p=byId(id); if(p) f(p); }); save(); requestDraw(); };
  el.querySelector("#bulkTagDo").onclick=()=>{ const t=el.querySelector("#bulkTag").value.trim(); if(!t) return;
    pushUndo(); each(p=>{ p.tags=p.tags||[]; if(!p.tags.includes(t)) p.tags.push(t); }); renderSide(); };
  el.querySelectorAll("[data-bst]").forEach(b=>b.onclick=()=>{ pushUndo(); each(p=>p.status=b.dataset.bst); renderSide(); });
  el.querySelectorAll("[data-bcol]").forEach(b=>b.onclick=()=>{ pushUndo();
    each(p=>{ if(b.dataset.bcol) p.color=b.dataset.bcol; else delete p.color; }); renderSide(); });
  el.querySelectorAll("[data-bem]").forEach(b=>b.onclick=()=>{ pushUndo();
    each(p=>{ if(b.dataset.bem) p.emph=b.dataset.bem; else delete p.emph; }); renderSide(); });
  el.querySelector("#bulkClear").onclick=()=>{ selSet.clear(); renderSide(); requestDraw(); };
  el.querySelector("#bulkDel").onclick=()=>{ pushUndo(); [...selSet].forEach(id=>deletePaper(id)); selSet.clear();
    save(); renderSide(); updateStats(); requestDraw(); };
}
function renderSide(){
  editSession=null;
  const el=document.getElementById("sideInner");
  if(selEdge){ return renderEdgePanel(el); }
  if(selSet.size>1){ return renderMultiPanel(el); }
  if(!selId){ return renderStatsPanel(el); }
  const p=byId(selId); if(!p){ selId=null; return renderSide(); }
  const cites=state.edges.filter(e=>e.from===p.id);
  const citedBy=state.edges.filter(e=>e.to===p.id);
  function connRow(e,otherId){ const o=byId(otherId); if(!o) return "";
    return `<div class="refitem"><div class="top">
        <span class="lbl" data-go="${o.id}">${esc(refLabel(o))}</span>
        <button class="x" data-unlink="${e.from}|${e.to}" title="Remove link">✕</button></div>
        <input class="rel" data-rel="${e.from}|${e.to}" placeholder="How is it used? e.g. proves Lemma 2 …" value="${esc(e.label||"")}"></div>`; }
  el.innerHTML=`
    <h2>${esc(p.title)}</h2>
    <div class="meta">${esc(p.authors)||"—"}</div>
    <div class="meta">${esc([p.year,p.venue].filter(Boolean).join(" · "))}</div>
    ${p.doi?`<div class="meta"><a href="#" id="doiLink">${esc(p.doi)}</a></div>`:""}
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
      <button id="editBtn">Edit</button>
      <button id="shapeBtn">${effShape(p)==="dot"?"▭ As card":"◯ As circle"}</button>
      <button id="linkFromHere">🔗 Link</button>
      <button id="focusBtn" class="${focusId===p.id?"active":""}" title="Dim everything beyond 2 hops">🎯 Focus</button>
      <button id="delBtn" style="margin-left:auto">Delete</button>
    </div>
    <div style="display:flex;gap:4px;margin-top:8px">
      ${["toread","skimmed","read"].map(s=>`<button data-st="${s}" class="${(p.status||"toread")===s?"active":""}" style="flex:1;padding:4px 2px;font-size:12px">${s==="toread"?"📕 To read":s==="skimmed"?"📖 Skimmed":"✅ Read"}</button>`).join("")}
    </div>
    <div class="section"><h3>Tags</h3><input id="tagsIn" placeholder="comma, separated" value="${esc((p.tags||[]).join(", "))}"></div>
    <div class="section"><h3>Colour & style</h3>
      <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
        ${PALETTE.map(c=>`<button data-col="${c}" title="${c}" style="background:${c};width:22px;height:22px;border-radius:6px;padding:0;border:${p.color===c?"2px solid #232a40":"1px solid rgba(0,0,0,.15)"}"></button>`).join("")}
        <input type="color" id="colPick" value="${p.color||colorFor(p)}" title="Custom colour" style="width:28px;height:26px;padding:0;border:1px solid var(--line);border-radius:6px;background:#fff">
        <button data-col="" title="Back to automatic colour" style="font-size:11px;padding:3px 8px">Auto</button>
      </div>
      <div style="display:flex;gap:4px;margin-top:8px">
        <button data-em="" class="${!p.emph?"active":""}" style="flex:1;font-size:12px">Normal</button>
        <button data-em="hi" class="${p.emph==="hi"?"active":""}" style="flex:1;font-size:12px">✨ Glow</button>
        <button data-em="hero" class="${p.emph==="hero"?"active":""}" style="flex:1;font-size:12px">🌟 Hero</button>
        <button data-em="low" class="${p.emph==="low"?"active":""}" style="flex:1;font-size:12px">Faded</button>
      </div>
    </div>
    <div class="section"><h3>Notes / Summary</h3>
      <textarea id="noteArea" rows="6" placeholder="Key claim, method, result, why it matters…">${esc(p.note)}</textarea></div>
    ${p.abstract?`<div class="section"><h3>Abstract</h3><div class="meta" style="max-height:120px;overflow:auto">${esc(p.abstract)}</div></div>`:""}
    <div class="section"><h3>Cites (${cites.length})</h3>
      ${cites.length?cites.map(e=>connRow(e,e.to)).join(""):'<p class="empty">none</p>'}</div>
    <div class="section"><h3>Cited by (${citedBy.length})</h3>
      ${citedBy.length?citedBy.map(e=>connRow(e,e.from)).join(""):'<p class="empty">none</p>'}</div>`;
  const note=el.querySelector("#noteArea");
  note.addEventListener("input",()=>{ editUndo("note:"+p.id); p.note=note.value; save(); requestDraw(); });
  el.querySelector("#editBtn").onclick=()=>openPaperModal(p);
  el.querySelector("#shapeBtn").onclick=()=>{ pushUndo(); p.shape= effShape(p)==="dot"?"card":"dot"; save(); renderSide(); requestDraw(); };
  el.querySelector("#delBtn").onclick=()=>{ pushUndo(); deletePaper(p.id); save(); renderSide(); updateStats(); requestDraw(); };
  el.querySelector("#linkFromHere").onclick=()=>{ toggleLink(true); linkFirst=p.id; updateHint(); requestDraw(); };
  el.querySelector("#focusBtn").onclick=()=>{ focusId= focusId===p.id? null : p.id; renderSide(); requestDraw(); };
  el.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{ pushUndo(); p.status=b.dataset.st; save(); renderSide(); requestDraw(); });
  const tagsIn=el.querySelector("#tagsIn");
  tagsIn.addEventListener("input",()=>{ editUndo("tags:"+p.id); p.tags=tagsIn.value.split(",").map(s=>s.trim()).filter(Boolean); save(); requestDraw(); });
  el.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>{ pushUndo();
    if(b.dataset.col) p.color=b.dataset.col; else delete p.color;
    save(); renderSide(); requestDraw(); });
  const colPick=el.querySelector("#colPick");
  colPick.addEventListener("input",()=>{ editUndo("col:"+p.id); p.color=colPick.value; save(); requestDraw(); });
  el.querySelectorAll("[data-em]").forEach(b=>b.onclick=()=>{ pushUndo();
    if(b.dataset.em) p.emph=b.dataset.em; else delete p.emph;
    save(); renderSide(); requestDraw(); });
  const dl=el.querySelector("#doiLink"); if(dl) dl.onclick=ev=>{ev.preventDefault(); openDoi(p.doi);};
  el.querySelectorAll("[data-go]").forEach(s=>s.onclick=()=>{ selId=s.dataset.go; selEdge=null; renderSide(); focusNode(selId); requestDraw(); });
  el.querySelectorAll("[data-unlink]").forEach(b=>b.onclick=()=>{ const a=b.dataset.unlink.split("|"); pushUndo(); removeEdge(a[0],a[1]); save(); renderSide(); updateStats(); requestDraw(); });
  el.querySelectorAll("[data-rel]").forEach(inp=>inp.addEventListener("input",()=>{ const a=inp.dataset.rel.split("|"); const e=findEdge(a[0],a[1]); if(e){ editUndo("rel:"+inp.dataset.rel); e.label=inp.value; save(); requestDraw(); } }));
}
function renderEdgePanel(el){
  const e=findEdge(selEdge.from,selEdge.to); if(!e){ selEdge=null; return renderSide(); }
  const a=byId(e.from), b=byId(e.to);
  el.innerHTML=`<h2>Relationship</h2>
    <div class="section"><h3>Citing → Cited</h3>
      <div class="refitem"><span class="lbl" data-go="${a.id}">${esc(refLabel(a))}</span></div>
      <div style="text-align:center;color:var(--muted);margin:2px 0">↓ cites ↓</div>
      <div class="refitem"><span class="lbl" data-go="${b.id}">${esc(refLabel(b))}</span></div></div>
    <div class="section"><h3>How is it used?</h3>
      <textarea id="relArea" rows="4" placeholder="e.g. ${esc((a.authors||'A').split(',')[0])} uses the bound proven in ${esc((b.authors||'B').split(',')[0])} to…">${esc(e.label)}</textarea></div>
    <div style="display:flex;gap:6px;margin-top:10px;align-items:center">
      <button id="pinBtn">${e.pin?"📌 Label pinned":"📌 Pin label"}</button>
      <button id="delEdge" style="margin-left:auto">Delete link</button></div>
    <p class="meta" style="margin-top:6px">Pinned labels stay visible even when 🏷 Labels is off. (Shortcut: <kbd>Alt</kbd>-click the arrow.)</p>`;
  const ta=el.querySelector("#relArea"); ta.addEventListener("input",()=>{ editUndo("rel:"+e.from+"|"+e.to); e.label=ta.value; save(); requestDraw(); });
  el.querySelector("#pinBtn").onclick=()=>{ e.pin=!e.pin; save(); renderSide(); requestDraw(); };
  el.querySelectorAll("[data-go]").forEach(s=>s.onclick=()=>{ selId=s.dataset.go; selEdge=null; renderSide(); focusNode(selId); requestDraw(); });
  el.querySelector("#delEdge").onclick=()=>{ pushUndo(); removeEdge(e.from,e.to); selEdge=null; save(); renderSide(); updateStats(); requestDraw(); };
}
function focusNode(id){ const p=byId(id); if(!p) return; const [sx,sy]=w2s(p.x,p.y); view.x+=W/2-sx; view.y+=H/2-sy; requestDraw(); }
function openDoi(d){ let url=d;
  if(/^10\./.test(d)) url="https://doi.org/"+d;
  else if(/^arXiv:/i.test(d)) url="https://arxiv.org/abs/"+d.replace(/^arXiv:/i,"");
  else if(!/^https?:/i.test(d)) return;
  window.open(url,"_blank","noopener"); }

/* ============================ Hint / link mode / keys ============================ */
function updateHint(){
  const h=document.getElementById("hint");
  if(linkMode||shiftDown){ cv.classList.add("linking"); h.style.display="block";
    h.innerHTML= linkFirst? `Now click the <b>cited</b> paper — arrow goes citing → cited. <kbd>Esc</kbd> cancels.`
      : `<b>Link mode.</b> Click the <b>citing</b> paper, then the cited one.`;
  } else if(!state.papers.length){ cv.classList.remove("linking"); h.style.display="block";
    h.innerHTML=`No papers yet — click <b>＋ Add</b> to enter a paper or paste BibLaTeX.`;
  } else { cv.classList.remove("linking"); h.style.display="none"; }
}
function setLinkBtn(){ document.getElementById("btnLink").classList.toggle("active", linkMode||shiftDown); }
function toggleLink(on){ linkMode= on==null? !linkMode : on; if(!linkMode) linkFirst=null; setLinkBtn(); updateHint(); requestDraw(); }
document.getElementById("btnLink").onclick=()=>toggleLink();
function isTyping(e){ const t=(e.target.tagName||""); return t==="INPUT"||t==="TEXTAREA"; }
window.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="s"){ saveCurrent(); e.preventDefault(); return; }
  if(e.key==="Shift" && !shiftDown){ shiftDown=true; setLinkBtn(); updateHint(); }
  if(e.key==="Escape"){ layoutMenu.classList.remove("open"); exportMenu.classList.remove("open"); infoPop.classList.remove("open"); addMenu.classList.remove("open");
    if(colorFilter){ colorFilter=null; if(legendPop.classList.contains("open")) renderLegend(); requestDraw(); } if(linkFirst){linkFirst=null;updateHint();requestDraw();} else if(linkMode) toggleLink(false); closeAllModals(); hideTip();
    if(focusId){ focusId=null; renderSide(); requestDraw(); }
    if(selSet.size){ selSet.clear(); renderSide(); requestDraw(); }
    if(!isTyping(e) && isNarrow()) panelHide(); }
  if(isTyping(e)) return;
  if((e.key==="Delete"||e.key==="Backspace")){
    if(selSet.size){ pushUndo(); [...selSet].forEach(id=>deletePaper(id)); selSet.clear();
      save(); renderSide(); updateStats(); requestDraw(); e.preventDefault(); }
    else if(selId){ pushUndo(); deletePaper(selId); save(); renderSide(); updateStats(); requestDraw(); e.preventDefault(); }
    else if(selEdge){ pushUndo(); removeEdge(selEdge.from,selEdge.to); selEdge=null; save(); renderSide(); updateStats(); requestDraw(); e.preventDefault(); }
  }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="z" && !e.shiftKey){ undo(); e.preventDefault(); }
  if((e.ctrlKey||e.metaKey) && (e.key.toLowerCase()==="y" || (e.shiftKey && e.key.toLowerCase()==="z"))){ redo(); e.preventDefault(); }
  if(e.key.toLowerCase()==="l"){ toggleLink(); }
  if(e.key.toLowerCase()==="a" && !(e.ctrlKey||e.metaKey)){ arrange(); }
  if(e.key.toLowerCase()==="f"){ fit(); }
  if(e.key.toLowerCase()==="t"){ showLabels=!showLabels; setLabelsBtn(); save(); requestDraw(); }
});
window.addEventListener("keyup",e=>{ if(e.key==="Shift"){ shiftDown=false; if(!linkMode) linkFirst=null; setLinkBtn(); updateHint(); requestDraw(); } });

/* ============================ Modals ============================ */
function openModal(id){ document.getElementById(id).classList.add("open"); }
function closeModal(id){ const m=document.getElementById(id); m.classList.remove("open");
  if(m._resolve){ const r=m._resolve; m._resolve=null; r("cancel"); } }
function closeAllModals(){ document.querySelectorAll(".modal").forEach(m=>closeModal(m.id)); }
function ask(message,buttons){
  return new Promise(res=>{
    const m=document.getElementById("confirmModal");
    document.getElementById("confirmMsg").textContent=message;
    const row=document.getElementById("confirmBtns"); row.innerHTML="";
    for(const b of buttons){ const btn=document.createElement("button"); btn.textContent=b.label;
      if(b.primary) btn.className="primary";
      btn.onclick=()=>{ m._resolve=null; closeModal("confirmModal"); res(b.id); }; row.appendChild(btn); }
    m._resolve=res; openModal("confirmModal");
  });
}
window.closeModal=closeModal;
function openBib(){ document.getElementById("bibText").value=""; document.getElementById("bibCount").textContent=""; openModal("bibModal"); }
document.getElementById("bibText").addEventListener("input",function(){
  try{ const n=parseBib(this.value).length; document.getElementById("bibCount").textContent= n?`${n} entr${n===1?"y":"ies"} detected`:""; }catch(e){} });
const normDoi=d=>String(d||"").trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//,"").replace(/^doi:\s*/,"");
document.getElementById("bibDo").onclick=()=>{
  const entries=parseBib(document.getElementById("bibText").value);
  if(!entries.length){ toast("No BibLaTeX entries found — paste text starting with @article{…"); return; }
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
  placeNewInCorner(fresh);
  save(); updateStats(); updateHint(); closeModal("bibModal");
  toast(`Added ${added} paper${added===1?"":"s"}${skipped?` · skipped ${skipped} duplicate${skipped===1?"":"s"}`:""}`);
};
let editing=null;
const addMenu=document.getElementById("addMenu");
function renderAddMenu(){ addMenu.innerHTML=`<h4>Add papers</h4>
  <button class="item" data-add="manual">✍️ Enter manually <small>— one paper</small></button>
  <button class="item" data-add="bib">📥 Paste BibLaTeX <small>— bulk from Zotero</small></button>
  <button class="item" data-add="auto">🔍 Auto-link citations <small>— via OpenAlex, needs DOIs</small></button>`;
  addMenu.querySelector('[data-add="manual"]').onclick=()=>{ addMenu.classList.remove("open"); openPaperModal(null); };
  addMenu.querySelector('[data-add="bib"]').onclick=()=>{ addMenu.classList.remove("open"); openBib(); };
  addMenu.querySelector('[data-add="auto"]').onclick=()=>{ addMenu.classList.remove("open"); runAutoLink(); };
}
document.getElementById("btnAdd").onclick=e=>{ e.stopPropagation(); layoutMenu.classList.remove("open"); exportMenu.classList.remove("open"); infoPop.classList.remove("open");
  const open=addMenu.classList.toggle("open"); if(open){ renderAddMenu(); positionMenu(addMenu,"btnAdd"); } };
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
  document.getElementById("paperModalTitle").textContent= p?"Edit Paper":"Add Paper";
  document.getElementById("pTitle").value=p?p.title:""; document.getElementById("pAuthors").value=p?p.authors:"";
  document.getElementById("pYear").value=p?p.year:""; document.getElementById("pVenue").value=p?p.venue:"";
  document.getElementById("pDoi").value=p?p.doi:""; document.getElementById("pNote").value=p?p.note:"";
  openModal("paperModal"); setTimeout(()=>document.getElementById("pTitle").focus(),30); }
document.getElementById("paperDo").onclick=()=>{
  const data={ title:document.getElementById("pTitle").value.trim()||"Untitled",
    authors:document.getElementById("pAuthors").value.trim(), year:document.getElementById("pYear").value.trim(),
    venue:document.getElementById("pVenue").value.trim(), doi:document.getElementById("pDoi").value.trim(),
    note:document.getElementById("pNote").value };
  pushUndo();
  if(editing){ Object.assign(editing,data); }
  else { const p=addPaper(Object.assign({key:"",abstract:""},data)); selId=p.id; selEdge=null; const c=s2w(W/2,H/2); p.x=c[0]; p.y=c[1]; }
  save(); renderSide(); updateStats(); updateHint(); closeModal("paperModal"); requestDraw(); };

