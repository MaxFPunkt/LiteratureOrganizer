/* ============================ Hit testing ============================ */
function nodeAt(sx,sy){
  for(let i=state.papers.length-1;i>=0;i--){ const p=state.papers[i]; const [cx,cy]=w2s(p.x,p.y);
    if(effShape(p)==="dot"){ const r=dotR(p)*view.scale+2; if((sx-cx)**2+(sy-cy)**2<=r*r) return p; }
    else { const hw=CARDW/2*heroScale(p)*view.scale, hh=CARDH/2*heroScale(p)*view.scale; if(Math.abs(sx-cx)<=hw && Math.abs(sy-cy)<=hh) return p; } }
  return null;
}
function edgeAt(sx,sy){
  hebPos = bundlingActive()? hebNodePositions() : null;
  let best=null, bd=12;
  const segd=(px,py,ax,ay,bx,by)=>{
    const dx=bx-ax, dy=by-ay; const L2=dx*dx+dy*dy;
    let t= L2? ((px-ax)*dx+(py-ay)*dy)/L2 : 0; t=Math.max(0,Math.min(1,t));
    return Math.hypot(px-(ax+dx*t), py-(ay+dy*t));
  };
  for(const e of state.edges){ const pts=edgeRenderPts(e); if(!pts||pts.length<2) continue;
    for(let i=1;i<pts.length;i++){
      const d=segd(sx,sy,pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);
      if(d<bd){ bd=d; best=e; } } }
  return best;
}

/* ============================ Interaction ============================ */
let curMouse=null, dragging=null, panning=false, panStart=null, downPos=null, movedFar=false;
const tip=document.getElementById("tip");
function showTip(p,sx,sy){
  let n=(p.note||"").trim(); if(n.length>420) n=n.slice(0,419)+"…";
  const note=n? `<div class="tn">${esc(n)}</div>` : `<div class="tnone">No notes yet. Click the paper to add some.</div>`;
  const meta=[firstAuthor(p)&&(firstAuthor(p)+((p.authors||"").includes(",")?" et al.":"")),p.year].filter(Boolean).join(", ");
  tip.innerHTML=`<div class="tt">${esc(p.title||"Untitled")}</div>${meta?`<div class="tm">${esc(meta)}</div>`:""}${note}`;
  tip.style.display="block";
  const r=cv.getBoundingClientRect(); let tx=sx+16, ty=sy+14;
  if(tx+tip.offsetWidth>r.width) tx=sx-tip.offsetWidth-12;
  if(ty+tip.offsetHeight>r.height) ty=sy-tip.offsetHeight-10;
  tip.style.left=tx+"px"; tip.style.top=ty+"px";
}
function hideTip(){ tip.style.display="none"; }
function sameEdge(a,b){ return a&&b&&a.from===b.from&&a.to===b.to; }
cv.addEventListener("mousemove",e=>{
  const r=cv.getBoundingClientRect(); const sx=e.clientX-r.left, sy=e.clientY-r.top; curMouse=[sx,sy];
  if(downPos && Math.abs(sx-downPos[0])+Math.abs(sy-downPos[1])>4) movedFar=true;
  if(band){ band[2]=sx; band[3]=sy; requestDraw(); return; }
  if(dragging){ let [wx,wy]=s2w(sx,sy);
    [wx,wy]=snapPos(dragging,wx,wy,e.ctrlKey||e.metaKey);
    if(selSet.has(dragging.id) && selSet.size>1){ const gdx=wx-dragging.x, gdy=wy-dragging.y;
      for(const id of selSet){ if(id!==dragging.id){ const o=byId(id); if(o){ o.x+=gdx; o.y+=gdy; } } } }
    dragging.x=wx; dragging.y=wy; hideTip(); requestDraw(); return; }
  if(panning){ view.x=panStart[2]+(sx-panStart[0]); view.y=panStart[3]+(sy-panStart[1]); hideTip(); requestDraw(); return; }
  const hit=nodeAt(sx,sy);
  const newHover=hit?hit.id:null;
  let edgeHov=null; if(!hit) edgeHov=edgeAt(sx,sy);
  if(hit){ showTip(hit,sx,sy); cv.style.cursor=(linkMode||shiftDown)?"crosshair":"pointer"; }
  else { hideTip(); cv.style.cursor= edgeHov? "pointer":"grab"; }
  if(newHover!==hoverId || (edgeHov&&!sameEdge(edgeHov,hoverEdge)) || (!edgeHov&&hoverEdge)){
    hoverId=newHover; hoverEdge=edgeHov; requestDraw();
  }
});
cv.addEventListener("mouseleave",()=>{ hideTip(); hoverId=null; hoverEdge=null; requestDraw(); });
const GRIDSTEP=42;
function halfWn(p){ return effShape(p)==="dot"? dotR(p): CARDW/2*heroScale(p); }
function halfHn(p){ return effShape(p)==="dot"? dotR(p): CARDH/2*heroScale(p); }
function snapPos(node,wx,wy,disable){
  snapGuides=null;
  if(!snapOn || disable) return [wx,wy];
  const tol=8/view.scale;
  let bestX=null,bdx=tol,bestY=null,bdy=tol,nodeSnapX=false,nodeSnapY=false;
  const wD=halfWn(node), hD=halfHn(node);
  for(const o of state.papers){
    if(o.id===node.id) continue;
    if(selSet.has(node.id)&&selSet.has(o.id)) continue;
    const wO=halfWn(o), hO=halfHn(o);
    for(const cx of [o.x, o.x-wO+wD, o.x+wO-wD]){ const d=Math.abs(wx-cx); if(d<bdx){ bdx=d; bestX=cx; nodeSnapX=true; } }
    for(const cy of [o.y, o.y-hO+hD, o.y+hO-hD]){ const d=Math.abs(wy-cy); if(d<bdy){ bdy=d; bestY=cy; nodeSnapY=true; } }
  }
  if(bestX==null){ const g=Math.round(wx/GRIDSTEP)*GRIDSTEP; if(Math.abs(wx-g)<tol) bestX=g; }
  if(bestY==null){ const g=Math.round(wy/GRIDSTEP)*GRIDSTEP; if(Math.abs(wy-g)<tol) bestY=g; }
  const rx=bestX==null?wx:bestX, ry=bestY==null?wy:bestY;
  if(nodeSnapX||nodeSnapY) snapGuides={x:nodeSnapX?rx:null, y:nodeSnapY?ry:null};
  return [rx,ry];
}
let band=null, dragSnap=null;
cv.addEventListener("mousedown",e=>{
  const r=cv.getBoundingClientRect(); const sx=e.clientX-r.left, sy=e.clientY-r.top;
  downPos=[sx,sy]; movedFar=false;
  const hit=nodeAt(sx,sy);
  if(hit && !linkMode && !e.shiftKey && !e.altKey && !(e.ctrlKey||e.metaKey)){
    dragging=hit; dragSnap=snapshot();
    if(selSet.size && !selSet.has(hit.id)){ selSet.clear(); renderSide(); }
  }
  else if(!hit){
    if(e.ctrlKey||e.metaKey){ band=[sx,sy,sx,sy]; }
    else { panning=true; panStart=[sx,sy,view.x,view.y]; }
  }
});
window.addEventListener("mouseup",e=>{
  const r=cv.getBoundingClientRect(); const sx=e.clientX-r.left, sy=e.clientY-r.top;
  if(band){
    if(movedFar){
      const [ax,ay]=s2w(Math.min(band[0],band[2]),Math.min(band[1],band[3]));
      const [bx2,by2]=s2w(Math.max(band[0],band[2]),Math.max(band[1],band[3]));
      selSet.clear();
      for(const p of state.papers){ if(p.x>=ax&&p.x<=bx2&&p.y>=ay&&p.y<=by2) selSet.add(p.id); }
      selId=null; selEdge=null; renderSide(); if(selSet.size&&isNarrow()) panelShow();
    }
    band=null; downPos=null; requestDraw(); return;
  }
  if(dragging){ if(movedFar && dragSnap) pushUndoSnap(dragSnap); dragSnap=null; snapGuides=null; dragging=null; save(); }
  panning=false;
  if(downPos && !movedFar){ const hit=nodeAt(sx,sy); handleClick(hit,e.shiftKey,e.altKey,sx,sy,e.ctrlKey||e.metaKey); }
  downPos=null;
});
function handleClick(hit,shift,alt,sx,sy,ctrl){
  if(ctrl && !shift && !linkMode){
    if(hit){ if(selSet.has(hit.id)) selSet.delete(hit.id); else selSet.add(hit.id);
      selId=null; selEdge=null; renderSide(); requestDraw(); }
    return;
  }
  if(alt && !shift && !linkMode){
    const ed=edgeAt(sx,sy);
    if(ed){ pushUndo(); ed.pin=!ed.pin; selEdge={from:ed.from,to:ed.to}; selId=null; renderSide(); if(isNarrow()) panelShow(); save(); requestDraw(); }
    return;
  }
  if((linkMode||shift) && hit){
    if(!linkFirst){ linkFirst=hit.id; }
    else if(linkFirst===hit.id){ linkFirst=null; }
    else { pushUndo(); if(addEdge(linkFirst,hit.id)){ save(); } selEdge={from:linkFirst,to:hit.id}; selId=null; linkFirst=null; renderSide(); updateStats(); }
    updateHint(); requestDraw(); return;
  }
  if(hit){ selSet.clear(); selId=hit.id; selEdge=null; renderSide(); if(isNarrow()) panelShow(); requestDraw(); return; }
  const e=edgeAt(sx,sy);
  if(e){ selEdge={from:e.from,to:e.to}; selId=null; renderSide(); if(isNarrow()) panelShow(); }
  else if(!linkMode){ selId=null; selEdge=null; selSet.clear(); renderSide(); if(isNarrow()) panelHide(); }
  requestDraw();
}
cv.addEventListener("wheel",e=>{
  e.preventDefault();
  const r=cv.getBoundingClientRect(); const sx=e.clientX-r.left, sy=e.clientY-r.top;
  const [wx,wy]=s2w(sx,sy);
  view.scale=Math.min(4,Math.max(0.12,view.scale*Math.exp(-e.deltaY*0.0012)));
  const [nx,ny]=w2s(wx,wy); view.x+=sx-nx; view.y+=sy-ny; hideTip(); requestDraw();
},{passive:false});
cv.addEventListener("dblclick",e=>{
  const r=cv.getBoundingClientRect(); const hit=nodeAt(e.clientX-r.left,e.clientY-r.top);
  if(hit){ selId=hit.id; selEdge=null; renderSide(); const ta=document.getElementById("noteArea"); if(ta) ta.focus(); }
});

/* ============================ Touch (mobile) ============================ */
let pinch=null;
cv.addEventListener("touchstart",ev=>{
  closeMenus();
  const r=cv.getBoundingClientRect();
  if(ev.touches.length===1){ const t=ev.touches[0]; const sx=t.clientX-r.left, sy=t.clientY-r.top;
    downPos=[sx,sy]; movedFar=false; curMouse=[sx,sy]; const hit=nodeAt(sx,sy);
    if(hit && !linkMode){ dragging=hit; dragSnap=snapshot(); } else { panning=true; panStart=[sx,sy,view.x,view.y]; } }
  else if(ev.touches.length===2){ dragging=null; panning=false; downPos=null;
    const a=ev.touches[0],b=ev.touches[1]; const ax=a.clientX-r.left,ay=a.clientY-r.top,bx=b.clientX-r.left,by=b.clientY-r.top;
    pinch={d:Math.hypot(bx-ax,by-ay)||1, mx:(ax+bx)/2, my:(ay+by)/2, scale:view.scale, vx:view.x, vy:view.y}; }
  ev.preventDefault();
},{passive:false});
cv.addEventListener("touchmove",ev=>{
  const r=cv.getBoundingClientRect();
  if(ev.touches.length===2 && pinch){ const a=ev.touches[0],b=ev.touches[1];
    const ax=a.clientX-r.left,ay=a.clientY-r.top,bx=b.clientX-r.left,by=b.clientY-r.top;
    const d=Math.hypot(bx-ax,by-ay)||1, mx=(ax+bx)/2, my=(ay+by)/2;
    const wx=(pinch.mx-W/2-pinch.vx)/pinch.scale, wy=(pinch.my-H/2-pinch.vy)/pinch.scale;
    view.scale=Math.min(4,Math.max(0.12, pinch.scale*(d/pinch.d)));
    view.x=mx-W/2-wx*view.scale; view.y=my-H/2-wy*view.scale; hideTip(); requestDraw(); ev.preventDefault(); return; }
  if(ev.touches.length===1){ const t=ev.touches[0]; const sx=t.clientX-r.left, sy=t.clientY-r.top; curMouse=[sx,sy];
    if(downPos && Math.abs(sx-downPos[0])+Math.abs(sy-downPos[1])>6) movedFar=true;
    if(dragging){ const w=s2w(sx,sy); const sp=snapPos(dragging,w[0],w[1],false); dragging.x=sp[0]; dragging.y=sp[1]; requestDraw(); }
    else if(panning){ view.x=panStart[2]+(sx-panStart[0]); view.y=panStart[3]+(sy-panStart[1]); requestDraw(); }
    ev.preventDefault(); }
},{passive:false});
cv.addEventListener("touchend",ev=>{
  if(pinch && ev.touches.length<2) pinch=null;
  if(ev.touches.length===0){
    if(dragging){ if(movedFar && dragSnap) pushUndoSnap(dragSnap); dragSnap=null; snapGuides=null; dragging=null; save(); }
    panning=false;
    if(downPos && !movedFar && curMouse){ const hit=nodeAt(curMouse[0],curMouse[1]); handleClick(hit,false,false,curMouse[0],curMouse[1]); }
    downPos=null;
  }
},{passive:false});

