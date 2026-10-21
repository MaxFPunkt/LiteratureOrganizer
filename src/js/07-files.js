/* ============================ Open / Save / Export ============================ */
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove("show"),1900); }
function downloadBlob(text,name,type){ const blob=new Blob([text],{type}); const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function downloadBib(){ if(!state.papers.length){ toast("No papers to export"); return; }
  downloadBlob(toBib(),(currentFileName? currentFileName.replace(/\.json$/i,""):"litnet-"+new Date().toISOString().slice(0,10))+".bib","text/plain"); toast("BibLaTeX file downloaded"); }
function copyBib(){ if(!state.papers.length){ toast("No papers to export"); return; } const text=toBib();
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(()=>toast("BibLaTeX copied to clipboard")).catch(()=>fallbackCopy(text)); }
  else fallbackCopy(text); }
function fallbackCopy(text){ const ta=document.createElement("textarea"); ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); toast("BibLaTeX copied to clipboard"); }catch(e){ toast("Copy failed — use BibLaTeX → file"); } document.body.removeChild(ta); }

function applyJSON(d, replace){
  if(!d || !d.papers) throw new Error("bad json");
  pushUndo();
  if(replace){
    state.papers=d.papers; state.edges=(d.edges||[]).map(e=>Object.assign({label:"",pin:false},e)); uid=d.uid||1;
    bookmarks=d.bookmarks||[]; if(typeof d.showLabels==="boolean") showLabels=d.showLabels;
    if(d.globalShape) globalShape=d.globalShape; if(typeof d.bundleStrength==="number") bundleStrength=d.bundleStrength;
    if(typeof d.colorByTag==="boolean") colorByTag=d.colorByTag;
    if(typeof d.snapOn==="boolean") snapOn=d.snapOn;
    if(d.legendNames && typeof d.legendNames==="object") legendNames=d.legendNames;
    if(d.lastLayout) lastLayout=d.lastLayout;
  } else {
    const map={}; for(const p of d.papers){ const np=Object.assign({},p); const old=np.id; np.id=nextId(); map[old]=np.id; state.papers.push(np); }
    for(const e of (d.edges||[])){ if(map[e.from]&&map[e.to]){ state.edges.push({from:map[e.from],to:map[e.to],label:e.label||"",pin:!!e.pin}); } }
  }
  selId=null; selEdge=null; selSet.clear(); focusId=null; heb=null; setLabelsBtn(); setShapeBtn(); save(); renderSide(); updateStats(); updateHint();
  if(lastLayout==="circle" && state.papers.length) heb=buildHEB(currentCircularOrder());
  fit();
}
async function openFile(){
  if(hasFSA){
    let h;
    try{ const arr=await window.showOpenFilePicker({types:[{description:"LitNet JSON",accept:{"application/json":[".json"]}}]}); h=arr[0]; }
    catch(err){ return; }
    try{ const file=await h.getFile(); const d=JSON.parse(await file.text());
      if(state.papers.length){
        const c=await ask(`Open “${h.name}” and replace the current library?`,
          [{id:"cancel",label:"Cancel"},{id:"replace",label:"Replace",primary:true}]);
        if(c!=="replace") return;
      }
      fileHandle=h; currentFileName=h.name; applyJSON(d,true); updateFileName(); markClean(); toast("Opened "+h.name+" — Ctrl+S saves back to it"); }
    catch(err){ console.warn(err); toast("Could not read that file"); }
  } else { document.getElementById("fileIn").click(); }
}
document.getElementById("fileIn").onchange=function(){
  const f=this.files[0]; if(!f) return; const rd=new FileReader();
  rd.onload=async()=>{ try{ const d=JSON.parse(rd.result);
      let replace=true;
      if(state.papers.length){
        const c=await ask(`Open “${f.name}” — replace the current library or merge it in?`,
          [{id:"cancel",label:"Cancel"},{id:"merge",label:"Merge in"},{id:"replace",label:"Replace",primary:true}]);
        if(c==="cancel") return; replace= c==="replace";
      }
      applyJSON(d,replace); fileHandle=null; currentFileName=f.name; updateFileName();
      toast("Opened "+f.name+(hasFSA?"":" — Save will download (no live file link in this browser)")); }
    catch(e){ toast("Could not read that JSON file"); } };
  rd.readAsText(f); this.value=""; };
async function saveToHandle(){
  try{
    if(fileHandle.queryPermission){ let perm=await fileHandle.queryPermission({mode:"readwrite"});
      if(perm!=="granted"){ perm=await fileHandle.requestPermission({mode:"readwrite"}); if(perm!=="granted"){ toast("Write permission denied"); return; } } }
    const w=await fileHandle.createWritable(); await w.write(JSON.stringify(persistObj(),null,2)); await w.close();
    markClean(); toast("Saved to "+currentFileName);
  }catch(err){ console.warn(err); toast("Save failed — try Save As"); }
}
async function saveAs(){
  if(hasFSA){
    try{ const h=await window.showSaveFilePicker({ suggestedName: currentFileName || ("litnet-"+new Date().toISOString().slice(0,10)+".json"),
        types:[{description:"LitNet JSON",accept:{"application/json":[".json"]}}] });
      fileHandle=h; currentFileName=h.name; updateFileName(); await saveToHandle(); }
    catch(err){ if(err && err.name!=="AbortError"){ console.warn(err); } }
  } else { downloadBlob(JSON.stringify(persistObj(),null,2),"litnet-"+new Date().toISOString().slice(0,10)+".json","application/json"); markClean(); toast("Backup downloaded"); }
}
function draftMarkdown(){
  const used=new Set();
  const groups=new Map();
  for(const p of state.papers){ const t=(p.tags&&p.tags[0])||"Ungrouped";
    if(!groups.has(t)) groups.set(t,[]); groups.get(t).push(p); }
  let md="# Related Work (draft)\n\n_Generated by LitNet on "+new Date().toISOString().slice(0,10)+". Group order = tag; \\cite keys match the BibLaTeX export._\n";
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
function downloadDraft(){ if(!state.papers.length){ toast("No papers yet"); return; }
  downloadBlob(draftMarkdown(),"related-work-draft.md","text/markdown"); toast("Draft downloaded — grouped by first tag"); }
function saveCurrent(){ if(fileHandle) saveToHandle(); else saveAs(); }
document.getElementById("btnOpen").onclick=openFile;
document.getElementById("btnSave").onclick=saveCurrent;
document.getElementById("search").addEventListener("input",function(){ searchQ=this.value.trim(); requestDraw(); });
document.getElementById("btnSide").onclick=()=>{ const s=document.getElementById("side"); if(s.classList.contains("collapsed")) panelShow(); else panelHide(); };
document.querySelectorAll(".modal").forEach(m=>m.addEventListener("mousedown",e=>{ if(e.target===m) closeModal(m.id); }));

