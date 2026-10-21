/* ============================ Canvas ============================ */
const cv=document.getElementById("cv"), ctx=cv.getContext("2d");
let W=0,H=0,DPR=1;
let view={x:0,y:0,scale:1};
const CARDW=176, CARDH=66;
function heroScale(p){ return p.emph==="hero"?1.3:1; }
function dotR(p){ return (15+Math.min(20, inDegree(p.id)*4))*heroScale(p); }
function resize(){ DPR=window.devicePixelRatio||1; const r=cv.parentElement.getBoundingClientRect();
  W=r.width; H=r.height; cv.width=W*DPR; cv.height=H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0); requestDraw(); }
window.addEventListener("resize",resize);
function w2s(x,y){ return [x*view.scale+view.x+W/2, y*view.scale+view.y+H/2]; }
function s2w(sx,sy){ return [(sx-W/2-view.x)/view.scale, (sy-H/2-view.y)/view.scale]; }

let snapGuides=null;
let drawQueued=false;
function requestDraw(){ if(drawQueued) return; drawQueued=true; requestAnimationFrame(()=>{ drawQueued=false; draw(); }); }
function rectBorder(cx,cy,hw,hh,tx,ty){
  const dx=tx-cx, dy=ty-cy; if(dx===0&&dy===0) return [cx,cy];
  const sc=1/Math.max(Math.abs(dx)/hw, Math.abs(dy)/hh);
  return [cx+dx*sc, cy+dy*sc];
}
function nodeBorderScreen(p,tx,ty){
  const [cx,cy]=w2s(p.x,p.y);
  if(effShape(p)==="dot"){ const r=dotR(p)*view.scale; let dx=tx-cx,dy=ty-cy; const d=Math.hypot(dx,dy)||1; return [cx+dx/d*r, cy+dy/d*r]; }
  const hw=CARDW/2*heroScale(p)*view.scale, hh=CARDH/2*heroScale(p)*view.scale; return rectBorder(cx,cy,hw,hh,tx,ty);
}
function catmull(P,seg){
  if(P.length<3) return P.slice();
  const out=[];
  for(let i=0;i<P.length-1;i++){
    const p0=P[i-1]||P[i], p1=P[i], p2=P[i+1], p3=P[i+2]||P[i+1];
    for(let t=0;t<seg;t++){ const u=t/seg, u2=u*u, u3=u2*u;
      out.push([
        0.5*((2*p1[0])+(-p0[0]+p2[0])*u+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*u2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*u3),
        0.5*((2*p1[1])+(-p0[1]+p2[1])*u+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*u2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*u3)
      ]); }
  }
  out.push(P[P.length-1]); return out;
}
/* ---- hierarchy for circular edge bundling ---- */
function buildHEB(orderedIds){
  const leaves=orderedIds.slice(); const nodes=[];
  function build(lo,hi,depth){ const idx=nodes.length; nodes.push({children:[],leaf:null,depth,lo,hi});
    if(hi-lo<=1){ nodes[idx].leaf=leaves[lo]; return idx; }
    const mid=(lo+hi)>>1; const c1=build(lo,mid,depth+1), c2=build(mid,hi,depth+1);
    nodes[idx].children=[c1,c2]; return idx; }
  const root=build(0,leaves.length,0);
  let maxDepth=0; nodes.forEach(n=>maxDepth=Math.max(maxDepth,n.depth));
  const parent={}; nodes.forEach((n,i)=>n.children.forEach(c=>parent[c]=i));
  const leafIdxOf={}; nodes.forEach((n,i)=>{ if(n.leaf!=null) leafIdxOf[n.leaf]=i; });
  const leafChain={}; for(const id in leafIdxOf){ const ch=[]; let c=leafIdxOf[id]; while(c!=null){ ch.push(c); c=parent[c]; } leafChain[id]=ch; }
  return {leaves,nodes,root,maxDepth,parent,leafIdxOf,leafChain};
}
function currentCircularOrder(){
  let cx=0,cy=0; state.papers.forEach(p=>{cx+=p.x;cy+=p.y;}); const n=state.papers.length||1; cx/=n; cy/=n;
  return state.papers.map(p=>p.id).sort((a,b)=>{ const pa=byId(a),pb=byId(b);
    return Math.atan2(pa.y-cy,pa.x-cx)-Math.atan2(pb.y-cy,pb.x-cx); });
}
function hebNodePositions(){
  const Hh=heb, N=Hh.nodes.length, pos=new Array(N);
  let gx=0,gy=0,c=0; for(const id in Hh.leafIdxOf){ const p=byId(id); if(p){gx+=p.x;gy+=p.y;c++;} } gx/=c||1; gy/=c||1;
  for(let i=0;i<N;i++){ const node=Hh.nodes[i]; let sx=0,sy=0,k=0;
    for(let li=node.lo; li<node.hi; li++){ const p=byId(Hh.leaves[li]); if(p){sx+=p.x;sy+=p.y;k++;} }
    const cxv=k?sx/k:gx, cyv=k?sy/k:gy; const t=Hh.maxDepth? node.depth/Hh.maxDepth:1;
    pos[i]=[gx+(cxv-gx)*t, gy+(cyv-gy)*t]; }
  return pos;
}
function bundlingActive(){ return heb && lastLayout==="circle"; }
function hebEdgePts(e,a,b){
  const Hh=heb, ca=Hh.leafChain[a.id], cb=Hh.leafChain[b.id]; if(!ca||!cb) return null;
  const setB=new Set(cb); let lca=null; for(const nd of ca){ if(setB.has(nd)){ lca=nd; break; } }
  const upA=[]; for(const nd of ca){ upA.push(nd); if(nd===lca) break; }
  const downB=[]; for(const nd of cb){ if(nd===lca) break; downB.push(nd); } downB.reverse();
  const path=[...upA,...downB];
  let ctrl=path.map(idx=>{ const w=hebPos[idx]; return w2s(w[0],w[1]); });
  if(ctrl.length>=2){
    ctrl[0]=nodeBorderScreen(a, ctrl[1][0], ctrl[1][1]);
    ctrl[ctrl.length-1]=nodeBorderScreen(b, ctrl[ctrl.length-2][0], ctrl[ctrl.length-2][1]);
  }
  const m=ctrl.length, P0=ctrl[0], Pl=ctrl[m-1], beta=bundleStrength;
  const straight=ctrl.map((p,i)=>{ const t=m>1? i/(m-1):0; const lx=P0[0]+t*(Pl[0]-P0[0]), ly=P0[1]+t*(Pl[1]-P0[1]);
    return [beta*p[0]+(1-beta)*lx, beta*p[1]+(1-beta)*ly]; });
  return catmull(straight,7);
}
function edgeRenderPts(e){
  const a=byId(e.from), b=byId(e.to); if(!a||!b) return null;
  if(bundlingActive() && heb.leafIdxOf[a.id]!=null && heb.leafIdxOf[b.id]!=null){ const r=hebEdgePts(e,a,b); if(r) return r; }
  const [ax,ay]=w2s(a.x,a.y), [bx,by]=w2s(b.x,b.y);
  const p0=nodeBorderScreen(a,bx,by), p2=nodeBorderScreen(b,ax,ay);
  const steps=12, pts=[];
  for(let i=0;i<=steps;i++){ pts.push([p0[0]+(p2[0]-p0[0])*i/steps, p0[1]+(p2[1]-p0[1])*i/steps]); }
  return pts;
}
function wrapLines(text,maxW,maxLines){
  const words=text.split(/\s+/); const lines=[]; let cur="";
  for(const w of words){ const t=cur?cur+" "+w:w;
    if(ctx.measureText(t).width>maxW && cur){ lines.push(cur); cur=w; if(lines.length>=maxLines) break; } else cur=t; }
  if(lines.length<maxLines && cur) lines.push(cur);
  if(lines.length>=maxLines){ let last=lines[maxLines-1]||"";
    while(ctx.measureText(last+"…").width>maxW && last.length>1) last=last.slice(0,-1);
    if((text.length>lines.join(" ").length)) lines[maxLines-1]=last+"…"; }
  return lines.slice(0,maxLines);
}
function drawGrid(){
  const step=42*view.scale; if(step<14) return;
  const [w0x,w0y]=s2w(0,0);
  const [ox,oy]=w2s(Math.floor(w0x/42)*42, Math.floor(w0y/42)*42);
  ctx.fillStyle="rgba(120,140,190,.16)";
  for(let x=ox%step; x<W; x+=step){
    for(let y=oy%step; y<H; y+=step){ ctx.beginPath(); ctx.arc(x,y,1.1,0,6.283); ctx.fill(); }
  }
}
function roundRect(x,y,w,h,r){ r=Math.min(r,w/2,h/2);
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function roundRectLeft(x,y,w,h,r){ r=Math.min(r,h/2);
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w,y); ctx.lineTo(x+w,y+h); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function strokePolyline(pts){ ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]); ctx.stroke(); }
function draw(){
  ctx.clearRect(0,0,W,H);
  drawGrid();
  hebPos = bundlingActive()? hebNodePositions() : null;
  const litSet = computeLit();
  const fSet = focusId? focusSet() : null;
  const labelJobs=[], nodeRects=[];
  for(const p of state.papers){
    if(p.emph!=="hi") continue;
    const gcol=colorFor(p); const [gx,gy]=w2s(p.x,p.y);
    const gdim=(litSet? !litSet.has(p.id):false) || (fSet? !fSet.has(p.id):false);
    ctx.globalAlpha= gdim?0.15:1;
    ctx.shadowColor=gcol; ctx.shadowOffsetY=0; ctx.fillStyle=gcol;
    if(effShape(p)==="dot"){
      const gr=dotR(p)*view.scale;
      if(!(gx+gr<-60||gx-gr>W+60||gy+gr<-60||gy-gr>H+60)){
        ctx.shadowBlur=24; ctx.beginPath(); ctx.arc(gx,gy,gr,0,6.283); ctx.fill(); ctx.fill(); ctx.fill(); }
    } else {
      const ghw=CARDW*view.scale, ghh=CARDH*view.scale; const gxx=gx-ghw/2, gyy=gy-ghh/2;
      if(!(gxx>W+60||gyy>H+60||gxx+ghw<-60||gyy+ghh<-60)){
        ctx.shadowBlur=26; roundRect(gxx,gyy,ghw,ghh,12*view.scale); ctx.fill(); ctx.fill(); ctx.fill(); }
    }
    ctx.shadowBlur=0; ctx.globalAlpha=1;
  }
  const q=searchQ.toLowerCase();
  for(const e of state.edges){
    const pts=edgeRenderPts(e); if(!pts||pts.length<2) continue;
    const sel=(selEdge&&selEdge.from===e.from&&selEdge.to===e.to);
    const conn=(selId===e.from||selId===e.to);
    const hov=(hoverEdge&&hoverEdge.from===e.from&&hoverEdge.to===e.to);
    const lblMatch = litSet && (e.label||"").toLowerCase().includes(q) && q;
    const edim = (litSet && !(litSet.has(e.from)||litSet.has(e.to)) && !lblMatch) || (fSet && !(fSet.has(e.from)&&fSet.has(e.to)));
    ctx.globalAlpha = edim?0.12:1;
    ctx.strokeStyle= lblMatch? "rgba(31,169,113,.95)" : sel||hov? "rgba(255,138,91,.95)" : conn? "rgba(108,140,255,.85)" : "rgba(90,106,145,.62)";
    ctx.lineWidth= (lblMatch||sel)?2.8: (conn||hov)?2.4:1.8;
    strokePolyline(pts);
    const e1=pts[pts.length-1], e0=pts[pts.length-2];
    const ang=Math.atan2(e1[1]-e0[1], e1[0]-e0[0]); const ah=8.5;
    ctx.beginPath(); ctx.moveTo(e1[0],e1[1]);
    ctx.lineTo(e1[0]-Math.cos(ang-.42)*ah, e1[1]-Math.sin(ang-.42)*ah);
    ctx.lineTo(e1[0]-Math.cos(ang+.42)*ah, e1[1]-Math.sin(ang+.42)*ah);
    ctx.closePath(); ctx.fillStyle=ctx.strokeStyle; ctx.fill();
    const showThis=(showLabels || e.pin || sel || lblMatch || hov);
    if(e.label && showThis && view.scale>0.45 && !edim){
      labelJobs.push({e,pts,sel:!!sel,lblMatch:!!lblMatch,hov:!!hov});
    }
    ctx.globalAlpha=1;
  }
  for(const p of state.papers){
    const dim = (litSet? !litSet.has(p.id) : false) || (fSet? !fSet.has(p.id) : false);
    const lit = litSet? litSet.has(p.id) : false;
    const hasNote=p.note && p.note.trim();
    const col=colorFor(p);
    const isSel=p.id===selId, isHover=p.id===hoverId, isLF=p.id===linkFirst;
    const [cx,cy]=w2s(p.x,p.y);
    ctx.globalAlpha= dim?0.22: (p.emph==="low"?0.45:1);
    if(effShape(p)==="dot"){
      const r=dotR(p)*view.scale;
      nodeRects.push([cx-r,cy-r,2*r,2*r]);
      if(cx+r<0||cx-r>W||cy+r<0||cy-r>H){ ctx.globalAlpha=1; continue; }
      if(lit){ ctx.beginPath(); ctx.arc(cx,cy,r+4,0,6.283); ctx.strokeStyle="rgba(31,169,113,.95)"; ctx.lineWidth=3; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx,cy,r,0,6.283);
      ctx.fillStyle= hasNote? col : "#cdd6e8";
      ctx.shadowColor="rgba(40,55,95,.18)"; ctx.shadowBlur=isSel?14:6; ctx.shadowOffsetY=2; ctx.fill();
      ctx.shadowBlur=0; ctx.shadowOffsetY=0;
      const inSelD=selSet.has(p.id);
      ctx.lineWidth= (isSel||inSelD)?3:isLF?3:isHover?2:1.2;
      ctx.strokeStyle= isLF?"#ff8a5b": inSelD?"#6C8CFF": isSel?"#232a40": "rgba(255,255,255,.85)"; ctx.stroke();
      if(p.status && p.status!=="toread" && view.scale>0.4){
        const sc= p.status==="read"?"#34c7a0":"#ffc247";
        ctx.beginPath(); ctx.arc(cx+r*0.75, cy-r*0.75, Math.max(3.5,4.5*view.scale), 0, 6.283);
        ctx.fillStyle=sc; ctx.fill(); ctx.strokeStyle="#fff"; ctx.lineWidth=1.2; ctx.stroke();
      }
      if(p.emph==="hi"){
        ctx.beginPath(); ctx.arc(cx,cy,r+5,0,6.283); ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.stroke();
      }
      if(p.emph==="hero"){
        ctx.beginPath(); ctx.arc(cx,cy,r+5,0,6.283); ctx.strokeStyle=col; ctx.lineWidth=3; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,cy,r+9.5,0,6.283); ctx.strokeStyle= col.length===7? col+"4D":col; ctx.lineWidth=3; ctx.stroke();
      }
      if((view.scale>0.45 || p.emph==="hero") && !dim){
        const label= p.emph==="hero"? (p.title||"Untitled") : ((p.authors? p.authors.split(",")[0].trim():"?")+(p.year?" "+p.year:""));
        ctx.fillStyle="#39415c"; ctx.font=(p.emph==="hero"?"700 ":"")+"11px -apple-system,sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillText(label.slice(0,30), cx, cy+r+(p.emph==="hero"?13:3));
      }
      ctx.globalAlpha=1; continue;
    }
    const hw=CARDW*heroScale(p)*view.scale, hh=CARDH*heroScale(p)*view.scale; const x=cx-hw/2, y=cy-hh/2;
    nodeRects.push([x,y,hw,hh]);
    if(x>W||y>H||x+hw<0||y+hh<0){ ctx.globalAlpha=1; continue; }
    if(lit){ ctx.lineWidth=3.5; ctx.strokeStyle="rgba(31,169,113,.95)"; roundRect(x-3,y-3,hw+6,hh+6,14*view.scale); ctx.stroke(); }
    ctx.fillStyle= (hasNote||p.emph==="hero")? "#ffffff":"#f4f7fc";
    ctx.shadowColor="rgba(40,55,95,.16)"; ctx.shadowBlur= isSel?16:8; ctx.shadowOffsetY=3;
    roundRect(x,y,hw,hh,12*view.scale); ctx.fill();
    ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    if(p.emph!=="hero"){
      ctx.fillStyle= hasNote? col : "#c7d0e6";
      roundRectLeft(x,y,5.5*view.scale,hh,12*view.scale); ctx.fill();
    } else {
      ctx.save(); roundRect(x,y,hw,hh,12*view.scale); ctx.clip();
      ctx.fillStyle=col; ctx.fillRect(x,y,hw,hh*0.52);
      ctx.restore();
    }
    const inSel=selSet.has(p.id);
    ctx.lineWidth= (isSel||inSel)?3: isLF?3: isHover?2:1.2;
    ctx.strokeStyle= isLF? "#ff8a5b" : inSel? "#6C8CFF" : (isSel||p.emph==="hero")? col : "rgba(120,135,170,.35)";
    roundRect(x,y,hw,hh,12*view.scale); ctx.stroke();
    if(p.emph==="hi"){
      ctx.lineWidth=2.5; ctx.strokeStyle=col;
      roundRect(x-3,y-3,hw+6,hh+6,13*view.scale); ctx.stroke();
    }
    if(p.emph==="hero"){
      ctx.lineWidth=3; ctx.strokeStyle=col;
      roundRect(x-3.5,y-3.5,hw+7,hh+7,13*view.scale); ctx.stroke();
      ctx.strokeStyle= col.length===7? col+"4D":col;
      roundRect(x-8,y-8,hw+16,hh+16,16*view.scale); ctx.stroke();
    }
    const fs=12*view.scale*(p.emph==="hero"?1.08:1);
    if(fs>=6.5){
      const padL=x+11*view.scale, maxW=hw-18*view.scale;
      ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.font="700 "+fs.toFixed(1)+"px -apple-system,sans-serif";
      ctx.fillStyle= p.emph==="hero"? inkFor(col) : (dim?"#9aa6c4":"#232a40");
      const tlines=wrapLines(p.title||"Untitled",maxW,2);
      let ty=y+(p.emph==="hero"?8:9)*view.scale;
      for(const ln of tlines){ ctx.fillText(ln,padL,ty); ty+=fs*1.18; }
      ctx.font=(fs*0.92).toFixed(1)+"px -apple-system,sans-serif";
      ctx.fillStyle="#6b7488";
      const auth=p.authors? "("+p.authors+")":"(—)";
      const aln=wrapLines(auth,maxW,1);
      ctx.fillText(aln[0]||"",padL,y+hh-fs*1.35);
    } else if(p.emph==="hero" && !dim){
      ctx.font="700 11px -apple-system,sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillStyle="#232a40";
      let mt=p.title||"Untitled"; if(mt.length>32) mt=mt.slice(0,31)+"…";
      ctx.fillText(mt, cx, y+hh+5);
    }
    const cited=inDegree(p.id);
    if(cited>0 && view.scale>0.4){
      const bx=x+hw-12*view.scale, by=y+10*view.scale, br=9*view.scale;
      ctx.beginPath(); ctx.arc(bx,by,br,0,6.283);
      ctx.fillStyle= p.emph==="hero"? inkFor(col) : col; ctx.fill();
      ctx.fillStyle= p.emph==="hero"? (inkFor(col)==="#ffffff"? "#232a40":"#ffffff") : "#fff";
      ctx.font="700 "+(10*view.scale).toFixed(1)+"px -apple-system,sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(String(cited),bx,by+0.5);
    }
    if(p.status && p.status!=="toread" && view.scale>0.4){
      const sc= p.status==="read"?"#34c7a0":"#ffc247";
      ctx.beginPath(); ctx.arc(x+hw-12*view.scale, y+hh-10*view.scale, Math.max(3.5,4.5*view.scale), 0, 6.283);
      ctx.fillStyle=sc; ctx.fill(); ctx.strokeStyle="#fff"; ctx.lineWidth=1.2; ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  if(labelJobs.length){
    ctx.font="11px -apple-system,sans-serif";
    const placed=[];
    const overlaps=(x,y)=>!(x[0]+x[2]<y[0]||y[0]+y[2]<x[0]||x[1]+x[3]<y[1]||y[1]+y[3]<x[1]);
    labelJobs.sort((x,y)=>((y.sel||y.lblMatch||y.hov||y.e.pin)?1:0)-((x.sel||x.lblMatch||x.hov||x.e.pin)?1:0));
    for(const job of labelJobs){
      const {e,pts,sel,lblMatch,hov}=job;
      const must=sel||lblMatch||hov||e.pin;
      let txt=e.label; if(txt.length>34) txt=txt.slice(0,33)+"…";
      const tw=ctx.measureText(txt).width, pad=7, ph=18, pw=tw+pad*2;
      const at=t=>{
        const f=t*(pts.length-1), i=Math.min(pts.length-2,Math.floor(f)), u=f-i;
        const p0=pts[i], p1=pts[i+1];
        let ang=Math.atan2(p1[1]-p0[1],p1[0]-p0[0]);
        if(ang>Math.PI/2) ang-=Math.PI; else if(ang<-Math.PI/2) ang+=Math.PI;
        return {x:p0[0]+(p1[0]-p0[0])*u, y:p0[1]+(p1[1]-p0[1])*u, ang};
      };
      let best=null, bestScore=Infinity;
      outer:
      for(const off of [14,30,46]){
        for(const t of [0.5,0.42,0.58,0.34,0.66,0.26,0.74,0.18,0.82]){
          const q=at(t);
          const steep=Math.abs(q.ang)>0.72;
          const drawAng= steep? 0 : q.ang;
          const lx=q.x+off*Math.sin(q.ang), ly=q.y-off*Math.cos(q.ang);
          const bw=pw*Math.abs(Math.cos(drawAng))+ph*Math.abs(Math.sin(drawAng));
          const bh=pw*Math.abs(Math.sin(drawAng))+ph*Math.abs(Math.cos(drawAng));
          const box=[lx-bw/2,ly-bh/2,bw,bh];
          let score=0;
          for(const rc of placed){ if(overlaps(box,rc)){ score+=100; if(score>=bestScore) break; } }
          if(score<bestScore){ for(const rc of nodeRects){ if(overlaps(box,rc)){ score+=25; if(score>=bestScore) break; } } }
          if(score<bestScore){ bestScore=score; best={x:lx,y:ly,ang:drawAng,box,ex:q.x,ey:q.y}; if(!score) break outer; }
        }
      }
      if(!best) continue;
      if(bestScore>0 && !must) continue; // no clean spot — hidden until hover/select/pin
      placed.push(best.box);
      const lc= lblMatch?"rgba(31,169,113,.95)": (sel||hov)?"rgba(255,138,91,.95)": e.pin?"rgba(255,138,91,.7)":"rgba(108,140,255,.55)";
      ctx.strokeStyle=lc; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(best.ex,best.ey); ctx.lineTo(best.x,best.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(best.ex,best.ey,2.2,0,6.283); ctx.fillStyle=lc; ctx.fill();
      ctx.save(); ctx.translate(best.x,best.y); ctx.rotate(best.ang);
      ctx.fillStyle="rgba(255,255,255,.93)";
      ctx.strokeStyle= lblMatch?"rgba(31,169,113,.95)": (sel||hov)?"rgba(255,138,91,.95)": e.pin?"rgba(255,138,91,.7)":"rgba(108,140,255,.55)";
      ctx.lineWidth=(e.pin||sel||lblMatch)?1.6:1.2;
      roundRect(-pw/2,-ph/2,pw,ph,8); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#39415c"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(txt,0,0);
      ctx.restore();
    }
  }
  if((linkMode||shiftDown) && linkFirst && curMouse){
    const p=byId(linkFirst); if(p){ const [x1,y1]=w2s(p.x,p.y);
      ctx.strokeStyle="rgba(255,138,91,.85)"; ctx.setLineDash([6,5]); ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(curMouse[0],curMouse[1]); ctx.stroke(); ctx.setLineDash([]); }
  }
  if(band){
    const bx0=Math.min(band[0],band[2]), by0=Math.min(band[1],band[3]);
    const bw=Math.abs(band[2]-band[0]), bh=Math.abs(band[3]-band[1]);
    ctx.fillStyle="rgba(108,140,255,.08)"; ctx.fillRect(bx0,by0,bw,bh);
    ctx.strokeStyle="rgba(108,140,255,.9)"; ctx.setLineDash([5,4]); ctx.lineWidth=1.5;
    ctx.strokeRect(bx0,by0,bw,bh); ctx.setLineDash([]);
  }
  if(snapGuides && dragging){
    ctx.strokeStyle="rgba(255,138,91,.7)"; ctx.setLineDash([4,4]); ctx.lineWidth=1;
    if(snapGuides.x!=null){ const gx=w2s(snapGuides.x,0)[0]; ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
    if(snapGuides.y!=null){ const gy=w2s(0,snapGuides.y)[1]; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }
    ctx.setLineDash([]);
  }
}

