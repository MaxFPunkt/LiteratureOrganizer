/* ============================ State ============================ */
const KEY="litnet.v2";
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
let state={papers:[], edges:[]};
let bookmarks=[];
let showLabels=false;
let lastLayout="radial";
let globalShape="card";
let bundleStrength=0.85;
let heb=null, hebPos=null;
let fileHandle=null, currentFileName=null;
const hasFSA = (typeof window!=="undefined") && ('showOpenFilePicker' in window);
let selId=null, selEdge=null, hoverId=null, hoverEdge=null;
let selSet=new Set(), focusId=null, colorByTag=false;
let snapOn=true;
let legendNames={}, colorFilter=null;
let linkMode=false, linkFirst=null, searchQ="", shiftDown=false;
let uid=1;
/* Muted, print-friendly hues; all hold white text and read on the pale canvas. */
const PALETTE=["#3E6FB0","#C0623B","#2E8A6E","#7759B0","#C3962A","#B04C79","#2C8DA6","#6F8A35","#A84A4A"];
function nextId(){ return "p"+(uid++); }
function inkFor(c){
  if(!/^#[0-9a-fA-F]{6}$/.test(c||"")) return "#ffffff";
  const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b)>160? "#1C2421" : "#ffffff";
}
function colorFor(p){
  if(p.color) return p.color;
  let h=0, s=(colorByTag && p.tags && p.tags[0])? "tag:"+p.tags[0].toLowerCase() : (p.id||p.key||p.title||"x");
  for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return PALETTE[h%PALETTE.length];
}
/* Returns true when a stored library was found (used to seed demo papers only on the very first run). */
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){ const d=JSON.parse(raw); state.papers=d.papers||[]; state.edges=d.edges||[];
      bookmarks=d.bookmarks||[]; showLabels=!!d.showLabels; lastLayout=d.lastLayout||"radial";
      if(d.globalShape) globalShape=d.globalShape; if(typeof d.bundleStrength==="number") bundleStrength=d.bundleStrength;
      if(typeof d.colorByTag==="boolean") colorByTag=d.colorByTag;
      if(typeof d.snapOn==="boolean") snapOn=d.snapOn;
      if(d.legendNames && typeof d.legendNames==="object") legendNames=d.legendNames;
      uid=d.uid|| (state.papers.reduce((m,p)=>Math.max(m,parseInt((p.id||"p0").slice(1))||0),0)+1);
      return true;
    }
  }catch(e){ console.warn("load failed",e); }
  return false;
}
function persistObj(){ return {papers:state.papers,edges:state.edges,uid,bookmarks,showLabels,lastLayout,globalShape,bundleStrength,colorByTag,snapOn,legendNames}; }
let saveTimer=null, dirty=false;
function markDirty(){ dirty=true; updateDirty(); }
function markClean(){ dirty=false; updateDirty(); }
function updateDirty(){ const d=document.getElementById("dirtyMark"); if(d) d.style.visibility= dirty?"visible":"hidden";
  const b=document.getElementById("btnSave");
  if(b) b.title= dirty? (fileHandle? "Save changes to "+currentFileName+" (Ctrl/Cmd+S)" : "Save to a file (Ctrl/Cmd+S)") : "Save (Ctrl/Cmd+S)"; }
/* Autosave to this browser; "dirty" means the library has changes not yet written to a file. */
function save(){
  markDirty();
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    try{ localStorage.setItem(KEY,JSON.stringify(persistObj())); }
    catch(e){ console.warn("save failed",e); }
  },300);
}
function flushSave(){ clearTimeout(saveTimer); try{ localStorage.setItem(KEY,JSON.stringify(persistObj())); }catch(e){} }
function updateStats(){ const el=document.getElementById("stats"); if(!el) return;
  const n=state.papers.length, m=state.edges.length;
  el.textContent= n? `${n} paper${n===1?"":"s"}, ${m} link${m===1?"":"s"}` : ""; }
function libraryName(){ return currentFileName? currentFileName.replace(/\.json$/i,"") : null; }
function updateFileName(){ const el=document.getElementById("fname"); const nm=libraryName();
  el.textContent= nm || "Untitled library";
  el.classList.toggle("untitled",!nm);
  el.title= fileHandle? "Saving writes back to "+currentFileName : (nm? "Opened as a copy; saving downloads a new file" : "Not saved to a file yet. Your work is kept in this browser.");
  document.title= (nm||"Untitled library")+" — LitNet"; }

/* ---- undo ---- */
let undoStack=[], redoStack=[];
function snapshot(){ return JSON.stringify({papers:state.papers,edges:state.edges,uid,globalShape}); }
function pushUndoSnap(s){ undoStack.push(s); if(undoStack.length>40) undoStack.shift(); redoStack.length=0; }
function pushUndo(){ pushUndoSnap(snapshot()); }
let editSession=null;
function editUndo(key){ if(editSession!==key){ pushUndo(); editSession=key; } }
function applySnapshot(s){
  const d=JSON.parse(s); state.papers=d.papers; state.edges=d.edges; uid=d.uid;
  if(d.globalShape){ globalShape=d.globalShape; if(typeof setShapeBtn==="function") setShapeBtn(); }
  selId=null; selEdge=null; selSet.clear(); heb=null; save(); renderSide(); updateStats(); updateHint(); requestDraw(); }
function undo(){ const s=undoStack.pop(); if(!s) return; redoStack.push(snapshot()); applySnapshot(s); }
function redo(){ const s=redoStack.pop(); if(!s) return; undoStack.push(snapshot()); applySnapshot(s); }

/* ============================ Graph helpers ============================ */
function byId(id){ return state.papers.find(p=>p.id===id); }
function inDegree(id){ return state.edges.filter(e=>e.to===id).length; }
function outDegree(id){ return state.edges.filter(e=>e.from===id).length; }
function findEdge(from,to){ return state.edges.find(e=>e.from===from&&e.to===to); }
function addPaper(p){ p.id=p.id||nextId();
  if(p.x==null){ p.x=(Math.random()-.5)*600; p.y=(Math.random()-.5)*400; } state.papers.push(p); heb=null; return p; }
function hasEdge(a,b){ return state.edges.some(e=>e.from===a&&e.to===b); }
function addEdge(a,b){ if(a===b||hasEdge(a,b)) return false; state.edges.push({from:a,to:b,label:"",pin:false}); return true; }
function removeEdge(a,b){ state.edges=state.edges.filter(e=>!(e.from===a&&e.to===b));
  if(selEdge&&selEdge.from===a&&selEdge.to===b) selEdge=null; }
function deletePaper(id){ selSet.delete(id); if(focusId===id) focusId=null;
  state.papers=state.papers.filter(p=>p.id!==id);
  state.edges=state.edges.filter(e=>e.from!==id&&e.to!==id); if(selId===id) selId=null; heb=null; }
function effShape(p){ return p.shape || globalShape; }
function firstAuthor(p){ const a=(p.authors||"").split(",")[0].trim(); return a? a.split(" ").pop() : ""; }

/* ============================ Search ============================ */
function nodeText(p){ return (p.title+" "+p.authors+" "+p.venue+" "+p.year+" "+(p.note||"")+" "+((p.tags||[]).join(" "))).toLowerCase(); }
function focusSet(){
  const s=new Set([focusId]); let frontier=[focusId];
  for(let d=0;d<2;d++){ const next=[];
    for(const e of state.edges){ for(const id of frontier){
      if(e.from===id&&!s.has(e.to)){s.add(e.to);next.push(e.to);}
      if(e.to===id&&!s.has(e.from)){s.add(e.from);next.push(e.from);} } }
    frontier=next; }
  return s;
}
function computeLit(){
  if(colorFilter){ const lit=new Set();
    for(const p of state.papers){ if((p.color||"")===colorFilter) lit.add(p.id); }
    return lit; }
  if(!searchQ) return null;
  const q=searchQ.toLowerCase(); const lit=new Set();
  if(q.startsWith("#")){ const t=q.slice(1).trim(); if(!t) return null;
    for(const p of state.papers){ if((p.tags||[]).some(x=>x.toLowerCase().startsWith(t))) lit.add(p.id); }
    return lit; }
  for(const p of state.papers){ if(nodeText(p).includes(q)) lit.add(p.id); }
  for(const e of state.edges){ if((e.label||"").toLowerCase().includes(q)){ lit.add(e.from); lit.add(e.to); } }
  return lit;
}

