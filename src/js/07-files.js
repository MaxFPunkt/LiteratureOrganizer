/* ============================ New / Open / Save / Export ============================ */
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove("show"), Math.min(5000, 1800+msg.length*35)); }
function downloadBlob(text,name,type){ const blob=new Blob([text],{type}); const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function baseName(){ return libraryName() || ("litnet-"+new Date().toISOString().slice(0,10)); }
function downloadBib(){ if(!state.papers.length){ toast("There are no papers to export yet"); return; }
  downloadBlob(toBib(),baseName()+".bib","text/plain"); toast(`Exported ${state.papers.length} entries to ${baseName()}.bib`); }
function copyBib(){ if(!state.papers.length){ toast("There are no papers to copy yet"); return; } const text=toBib();
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(()=>toast(`Copied ${state.papers.length} BibLaTeX entries`)).catch(()=>fallbackCopy(text)); }
  else fallbackCopy(text); }
function fallbackCopy(text){ const ta=document.createElement("textarea"); ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); toast(`Copied ${state.papers.length} BibLaTeX entries`); }catch(e){ toast("The browser blocked the clipboard. Use Export, BibLaTeX file instead."); } document.body.removeChild(ta); }

function resetSelection(){ selId=null; selEdge=null; selSet.clear(); focusId=null; linkFirst=null; colorFilter=null; heb=null; }
function applyJSON(d, replace){
  if(!d || !Array.isArray(d.papers)) throw new Error("bad json");
  pushUndo();
  if(replace){
    state.papers=d.papers; state.edges=(d.edges||[]).map(e=>Object.assign({label:"",pin:false},e));
    uid=d.uid|| (state.papers.reduce((m,p)=>Math.max(m,parseInt((p.id||"p0").slice(1))||0),0)+1);
    bookmarks=d.bookmarks||[]; if(typeof d.showLabels==="boolean") showLabels=d.showLabels;
    if(d.globalShape) globalShape=d.globalShape; if(typeof d.bundleStrength==="number") bundleStrength=d.bundleStrength;
    if(typeof d.colorByTag==="boolean") colorByTag=d.colorByTag;
    if(typeof d.snapOn==="boolean") snapOn=d.snapOn;
    legendNames=(d.legendNames && typeof d.legendNames==="object")? d.legendNames : {};
    if(d.lastLayout) lastLayout=d.lastLayout;
  } else {
    const map={}; for(const p of d.papers){ const np=Object.assign({},p); const old=np.id; np.id=nextId(); map[old]=np.id; state.papers.push(np); }
    for(const e of (d.edges||[])){ if(map[e.from]&&map[e.to]){ state.edges.push({from:map[e.from],to:map[e.to],label:e.label||"",pin:!!e.pin}); } }
  }
  resetSelection(); setLabelsBtn(); setShapeBtn(); save(); renderSide(); updateStats(); updateHint();
  if(lastLayout==="circle" && state.papers.length) heb=buildHEB(currentCircularOrder());
  fit();
}

/* ---- New library ---- */
function hasUnsavedWork(){ return state.papers.length>0 && (dirty || !currentFileName); }
async function newLibrary(){
  if(hasUnsavedWork()){
    const where= currentFileName? `Changes to “${libraryName()}” have not been saved.` : "This library has not been saved to a file. It only exists in this browser.";
    const c=await ask(where+" Starting a new library replaces it.",
      [{id:"cancel",label:"Cancel"},{id:"discard",label:"Discard",danger:true},{id:"save",label:"Save first",primary:true}],
      "Start a new library?");
    if(c==="cancel") return;
    if(c==="save"){ const ok=await saveCurrent(); if(!ok) return; }
  }
  pushUndo();
  state={papers:[],edges:[]}; uid=1; bookmarks=[]; legendNames={};
  resetSelection(); fileHandle=null; currentFileName=null;
  setSearch(""); if(linkMode) toggleLink(false);
  view={x:0,y:0,scale:1};
  save(); flushSave(); markClean();
  updateFileName(); updateStats(); updateHint(); renderSide(); requestDraw();
  toast(`New library started. Press ${MOD}+Z to bring the previous papers back.`);
}

/* ---- Open ---- */
async function confirmReplace(name,allowMerge){
  if(!state.papers.length) return "replace";
  const msg= hasUnsavedWork()? "The current library has unsaved changes. Opening a file replaces it unless you merge." : "Opening a file replaces the current library unless you merge.";
  const btns=[{id:"cancel",label:"Cancel"}];
  if(allowMerge) btns.push({id:"merge",label:"Merge into current"});
  btns.push({id:"replace",label:"Replace",primary:true});
  return ask(msg,btns,`Open “${name}”?`);
}
async function openFile(){
  if(hasFSA){
    let h;
    try{ const arr=await window.showOpenFilePicker({types:[{description:"LitNet library",accept:{"application/json":[".json"]}}]}); h=arr[0]; }
    catch(err){ return; }
    try{ const file=await h.getFile(); const d=JSON.parse(await file.text());
      const c=await confirmReplace(h.name,true); if(c==="cancel") return;
      if(c==="merge"){ applyJSON(d,false); toast(`Merged ${d.papers.length} papers from ${h.name}`); return; }
      fileHandle=h; currentFileName=h.name; applyJSON(d,true); updateFileName(); markClean(); renderSide();
      toast(`Opened ${h.name}. Saving writes back to this file.`); }
    catch(err){ console.warn(err); toast("That file could not be read. Choose a library .json saved from LitNet."); }
  } else { document.getElementById("fileIn").click(); }
}
document.getElementById("fileIn").onchange=function(){
  const f=this.files[0]; if(!f) return; const rd=new FileReader();
  rd.onload=async()=>{ try{ const d=JSON.parse(rd.result);
      const c=await confirmReplace(f.name,true); if(c==="cancel") return;
      if(c==="merge"){ applyJSON(d,false); toast(`Merged ${d.papers.length} papers from ${f.name}`); return; }
      applyJSON(d,true); fileHandle=null; currentFileName=f.name; updateFileName(); markClean(); renderSide();
      toast(`Opened a copy of ${f.name}. This browser saves by downloading a new file.`); }
    catch(e){ toast("That file could not be read. Choose a library .json saved from LitNet."); } };
  rd.readAsText(f); this.value=""; };

/* ---- Save (each returns true when the library was written) ---- */
async function saveToHandle(){
  try{
    if(fileHandle.queryPermission){ let perm=await fileHandle.queryPermission({mode:"readwrite"});
      if(perm!=="granted"){ perm=await fileHandle.requestPermission({mode:"readwrite"}); if(perm!=="granted"){ toast("Not saved: the browser did not allow writing to the file"); return false; } } }
    const w=await fileHandle.createWritable(); await w.write(JSON.stringify(persistObj(),null,2)); await w.close();
    markClean(); toast("Saved to "+currentFileName); return true;
  }catch(err){ console.warn(err); toast("Not saved: the file could not be written. Try Export, Save as."); return false; }
}
async function saveAs(){
  if(hasFSA){
    try{ const h=await window.showSaveFilePicker({ suggestedName: currentFileName || (baseName()+".json"),
        types:[{description:"LitNet library",accept:{"application/json":[".json"]}}] });
      fileHandle=h; currentFileName=h.name; updateFileName(); const ok=await saveToHandle(); renderSide(); return ok; }
    catch(err){ if(err && err.name!=="AbortError"){ console.warn(err); toast("Not saved: the file could not be created"); } return false; }
  }
  const name=currentFileName || (baseName()+".json");
  downloadBlob(JSON.stringify(persistObj(),null,2),name,"application/json");
  currentFileName=name; updateFileName(); markClean(); renderSide(); toast("Downloaded "+name); return true;
}
function saveCurrent(){ return fileHandle? saveToHandle() : saveAs(); }

/* ---- Related-work draft ---- */
function draftMarkdown(){
  const used=new Set();
  const groups=new Map();
  for(const p of state.papers){ const t=(p.tags&&p.tags[0])||"Ungrouped";
    if(!groups.has(t)) groups.set(t,[]); groups.get(t).push(p); }
  let md="# Related Work (draft)\n\n_Generated by LitNet on "+new Date().toISOString().slice(0,10)+". Grouped by first tag; \\cite keys match the BibLaTeX export._\n";
  for(const [t,ps] of [...groups.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0])))){
    md+="\n## "+t+"\n\n";
    ps.sort((a,b)=>String(a.year).localeCompare(String(b.year)));
    for(const p of ps){
      md+="- **"+p.title+"** ("+(p.authors||"—")+(p.year?", "+p.year:"")+") \\cite{"+bibKey(p,used)+"}";
      if(p.note&&p.note.trim()) md+=" — "+p.note.trim().replace(/\s*\n+\s*/g," ");
      md+="\n";
      for(const e of state.edges.filter(e=>e.from===p.id&&e.label)){
        const o=byId(e.to); if(o) md+="  - "+e.label+" → *"+o.title+"*\n"; }
    }
  }
  return md;
}
function downloadDraft(){ if(!state.papers.length){ toast("There are no papers to draft from yet"); return; }
  downloadBlob(draftMarkdown(),baseName()+"-related-work.md","text/markdown"); toast("Downloaded the related-work draft"); }

document.getElementById("btnNew").onclick=newLibrary;
document.getElementById("btnOpen").onclick=openFile;
document.getElementById("btnSave").onclick=saveCurrent;
document.getElementById("btnSide").onclick=()=>{ if(document.getElementById("side").classList.contains("collapsed")) panelShow(); else panelHide(); };
window.addEventListener("beforeunload",e=>{ flushSave(); if(dirty && fileHandle){ e.preventDefault(); e.returnValue=""; } });
