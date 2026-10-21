/* ============================ State ============================ */
const KEY="litnet.v2";
const esc=s=>(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
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
const PALETTE=["#6C8CFF","#FF8A5B","#34C7A0","#B57BFF","#FFC247","#FF6B9D","#3FB6E6","#9CCB3B","#FF7A7A"];
function nextId(){ return "p"+(uid++); }
function inkFor(c){
  if(!/^#[0-9a-fA-F]{6}$/.test(c||"")) return "#ffffff";
  const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b)>150? "#232a40" : "#ffffff";
}
function colorFor(p){
  if(p.color) return p.color;
  let h=0, s=(colorByTag && p.tags && p.tags[0])? "tag:"+p.tags[0].toLowerCase() : (p.id||p.key||p.title||"x");
  for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return PALETTE[h%PALETTE.length];
}
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
    }
  }catch(e){ console.warn("load failed",e); }
}
function persistObj(){ return {papers:state.papers,edges:state.edges,uid,bookmarks,showLabels,lastLayout,globalShape,bundleStrength,colorByTag,snapOn,legendNames}; }
let saveTimer=null, dirty=false;
function markDirty(){ dirty=true; updateDirty(); }
function markClean(){ dirty=false; updateDirty(); }
function updateDirty(){ const b=document.getElementById("btnSave"); if(b) b.classList.toggle("dirty",dirty); }
function save(){
  markDirty();
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    try{ localStorage.setItem(KEY,JSON.stringify(persistObj())); flashSaved(); }
    catch(e){ console.warn("save failed",e); }
  },300);
}
function flashSaved(){ const el=document.getElementById("stats"); if(el){ el.dataset.saved="1"; updateStats(); setTimeout(()=>{el.dataset.saved="";updateStats();},900);} }
function updateStats(){ const el=document.getElementById("stats");
  el.textContent=`${state.papers.length} papers · ${state.edges.length} links${el.dataset.saved?" · saved ✓":""}`; }
function updateFileName(){ const el=document.getElementById("fname");
  el.textContent= currentFileName? ("📄 "+currentFileName):"";
  el.title= fileHandle? "Save / Ctrl+S writes back to this file" : (currentFileName?"Opened a copy — Save downloads a new file":""); }

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
  selId=null; selEdge=null; heb=null; save(); renderSide(); updateStats(); requestDraw(); }
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

