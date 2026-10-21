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
/* ---- canvas palette (mirrors the CSS tokens) ---- */
const C={
  paper:"#F4F6F5", surface:"#FFFFFF", pale:"#F7F9F8", ink:"#1C2421", ink2:"#55615C", ink3:"#86918C",
  rule:"#D9DFDC", paleStripe:"#C9D1CD", accent:"#1E6A50", accentDark:"#175540",
  marker:"#F2DF4B", markerSoft:"#FBF4B8", markerEdge:"#D9C52F", read:"#1E6A50", skimmed:"#C3962A",
  edge:"rgba(85,97,92,.42)", edgeConn:"rgba(30,106,80,.85)",
};
const SANS='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
const SERIF='Charter,"Bitstream Charter","Iowan Old Style",Georgia,"Palatino Linotype",Palatino,serif';
function font(weight,size,family){ return (weight?weight+" ":"")+size.toFixed(1)+"px "+family; }
function drawGrid(){
  const step=42*view.scale; if(step<14) return;
  const [w0x,w0y]=s2w(0,0);
  const [ox,oy]=w2s(Math.floor(w0x/42)*42, Math.floor(w0y/42)*42);
  ctx.fillStyle="rgba(28,36,33,.09)";
  for(let x=ox%step; x<W; x+=step){
    for(let y=oy%step; y<H; y+=step){ ctx.beginPath(); ctx.arc(x,y,1,0,6.283); ctx.fill(); }
  }
}
function roundRect(x,y,w,h,r){ r=Math.min(r,w/2,h/2);
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function roundRectLeft(x,y,w,h,r){ r=Math.min(r,h/2);
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w,y); ctx.lineTo(x+w,y+h); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function strokePolyline(pts){ ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]); ctx.stroke(); }
/* Highlighter swipe: a slightly ragged marker band behind a search hit. */
function markerSwipe(x,y,w,h,s){
  ctx.save(); ctx.fillStyle=C.marker; ctx.globalAlpha*=0.9;
  ctx.beginPath();
  ctx.moveTo(x-7*s, y-3*s); ctx.lineTo(x+w+5*s, y-6*s); ctx.lineTo(x+w+8*s, y+h+3*s); ctx.lineTo(x-4*s, y+h+6*s); ctx.closePath();
  ctx.fill(); ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,W,H);
  drawGrid();
  hebPos = bundlingActive()? hebNodePositions() : null;
  const litSet = computeLit();
  const fSet = focusId? focusSet() : null;
  const s=view.scale;
  const labelJobs=[], nodeRects=[];
  /* glow halos behind "Glow" papers */
  for(const p of state.papers){
    if(p.emph!=="hi") continue;
    const gcol=colorFor(p); const [gx,gy]=w2s(p.x,p.y);
    const gdim=(litSet? !litSet.has(p.id):false) || (fSet? !fSet.has(p.id):false);
    ctx.globalAlpha= gdim?0.12:0.55;
    ctx.shadowColor=gcol; ctx.shadowOffsetY=0; ctx.fillStyle=gcol;
    if(effShape(p)==="dot"){
      const gr=dotR(p)*s;
      if(!(gx+gr<-60||gx-gr>W+60||gy+gr<-60||gy-gr>H+60)){ ctx.shadowBlur=22; ctx.beginPath(); ctx.arc(gx,gy,gr,0,6.283); ctx.fill(); ctx.fill(); }
    } else {
      const ghw=CARDW*s, ghh=CARDH*s; const gxx=gx-ghw/2, gyy=gy-ghh/2;
      if(!(gxx>W+60||gyy>H+60||gxx+ghw<-60||gyy+ghh<-60)){ ctx.shadowBlur=24; roundRect(gxx,gyy,ghw,ghh,8*s); ctx.fill(); ctx.fill(); }
    }
    ctx.shadowBlur=0; ctx.globalAlpha=1;
  }
  /* edges */
  const q=searchQ.toLowerCase();
  for(const e of state.edges){
    const pts=edgeRenderPts(e); if(!pts||pts.length<2) continue;
    const sel=(selEdge&&selEdge.from===e.from&&selEdge.to===e.to);
    const conn=(selId===e.from||selId===e.to);
    const hov=(hoverEdge&&hoverEdge.from===e.from&&hoverEdge.to===e.to);
    const lblMatch = !!(litSet && q && !colorFilter && (e.label||"").toLowerCase().includes(q));
    const edim = (litSet && !(litSet.has(e.from)||litSet.has(e.to)) && !lblMatch) || (fSet && !(fSet.has(e.from)&&fSet.has(e.to)));
    ctx.globalAlpha = edim?0.12:1;
    if(lblMatch){ ctx.strokeStyle=C.marker; ctx.lineWidth=8; ctx.lineCap="round"; strokePolyline(pts); ctx.lineCap="butt"; }
    const col= (sel||hov)? C.accentDark : lblMatch? C.ink : conn? C.edgeConn : C.edge;
    ctx.strokeStyle=col; ctx.lineWidth= (sel||hov)?2.4 : (conn||lblMatch)?1.8 : 1.3;
    strokePolyline(pts);
    const e1=pts[pts.length-1], e0=pts[pts.length-2];
    const ang=Math.atan2(e1[1]-e0[1], e1[0]-e0[0]); const ah=(sel||hov)?9:7.5;
    ctx.beginPath(); ctx.moveTo(e1[0],e1[1]);
    ctx.lineTo(e1[0]-Math.cos(ang-.4)*ah, e1[1]-Math.sin(ang-.4)*ah);
    ctx.lineTo(e1[0]-Math.cos(ang+.4)*ah, e1[1]-Math.sin(ang+.4)*ah);
    ctx.closePath(); ctx.fillStyle=col; ctx.fill();
    const showThis=(showLabels || e.pin || sel || lblMatch || hov);
    if(e.label && showThis && s>0.45 && !edim) labelJobs.push({e,pts,sel:!!sel,lblMatch,hov:!!hov});
    ctx.globalAlpha=1;
  }
  /* papers */
  for(const p of state.papers){
    const dim = (litSet? !litSet.has(p.id) : false) || (fSet? !fSet.has(p.id) : false);
    const lit = !!(litSet && litSet.has(p.id));
    const hasNote=!!(p.note && p.note.trim());
    const col=colorFor(p);
    const isSel=p.id===selId, isHover=p.id===hoverId, isLF=p.id===linkFirst, inSel=selSet.has(p.id);
    const hero=p.emph==="hero";
    const [cx,cy]=w2s(p.x,p.y);
    ctx.globalAlpha= dim?0.2 : (p.emph==="low"?0.45:1);
    if(effShape(p)==="dot"){
      const r=dotR(p)*s;
      nodeRects.push([cx-r,cy-r,2*r,2*r+16]);
      if(cx+r<-40||cx-r>W+40||cy+r<-40||cy-r>H+40){ ctx.globalAlpha=1; continue; }
      if(lit){ ctx.beginPath(); ctx.arc(cx,cy,r+7*Math.max(s,.6),0,6.283); ctx.fillStyle=C.marker; ctx.fill(); }
      if(hero){ ctx.beginPath(); ctx.arc(cx,cy,r+5,0,6.283); ctx.strokeStyle=col; ctx.lineWidth=2; ctx.stroke(); }
      ctx.beginPath(); ctx.arc(cx,cy,r,0,6.283);
      ctx.fillStyle= hasNote||hero? col : C.paleStripe;
      ctx.shadowColor="rgba(28,36,33,.16)"; ctx.shadowBlur=isSel?10:4; ctx.shadowOffsetY=1; ctx.fill();
      ctx.shadowBlur=0; ctx.shadowOffsetY=0;
      ctx.lineWidth=2; ctx.strokeStyle=C.surface; ctx.stroke();
      if(isSel||inSel||isLF){ ctx.beginPath(); ctx.arc(cx,cy,r+3.5,0,6.283); ctx.lineWidth=2; ctx.strokeStyle=C.accent;
        if(isLF) ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]); }
      else if(isHover){ ctx.beginPath(); ctx.arc(cx,cy,r+3,0,6.283); ctx.lineWidth=1.5; ctx.strokeStyle=C.ink3; ctx.stroke(); }
      const cited=inDegree(p.id);
      if(cited>0 && r>=12){ ctx.fillStyle=inkFor(hasNote||hero?col:C.paleStripe); ctx.font=font(600,Math.min(13,r*.75),SANS);
        ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(String(cited),cx,cy+.5); }
      if(p.status && p.status!=="toread" && s>0.4){
        ctx.beginPath(); ctx.arc(cx+r*0.72, cy-r*0.72, 4.5, 0, 6.283);
        ctx.fillStyle= p.status==="read"?C.read:C.skimmed; ctx.fill(); ctx.strokeStyle=C.surface; ctx.lineWidth=1.5; ctx.stroke();
      }
      if((s>0.45 || hero) && !dim){
        const label= hero? (p.title||"Untitled") : ((firstAuthor(p)||"Untitled")+(p.year?" "+p.year:""));
        ctx.fillStyle=C.ink2; ctx.font= hero? font(600,12,SERIF) : font(0,11,SANS);
        ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillText(label.length>34?label.slice(0,33)+"…":label, cx, cy+r+(hero?9:5));
      }
      ctx.globalAlpha=1; continue;
    }
    const hs=heroScale(p), hw=CARDW*hs*s, hh=CARDH*hs*s; const x=cx-hw/2, y=cy-hh/2, rad=8*s;
    nodeRects.push([x,y,hw,hh]);
    if(x>W+20||y>H+20||x+hw<-20||y+hh<-20){ ctx.globalAlpha=1; continue; }
    if(lit) markerSwipe(x,y,hw,hh,s);
    if(hero){ ctx.lineWidth=2; ctx.strokeStyle=col; roundRect(x-4*s,y-4*s,hw+8*s,hh+8*s,rad+3*s); ctx.stroke(); }
    ctx.fillStyle= lit? "#FCF6C4" : (hasNote||hero)? C.surface : C.pale;
    ctx.shadowColor="rgba(28,36,33,.10)"; ctx.shadowBlur= isSel?14:5; ctx.shadowOffsetY= isSel?3:1;
    roundRect(x,y,hw,hh,rad); ctx.fill();
    ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    if(hero){ ctx.save(); roundRect(x,y,hw,hh,rad); ctx.clip(); ctx.fillStyle=col; ctx.fillRect(x,y,hw,hh*0.56); ctx.restore(); }
    else { ctx.fillStyle= hasNote? col : C.paleStripe; roundRectLeft(x,y,4*s,hh,rad); ctx.fill(); }
    if(isSel||inSel||isLF){ ctx.lineWidth=2; ctx.strokeStyle=C.accent; if(isLF) ctx.setLineDash([5,4]); }
    else { ctx.lineWidth= isHover?1.5:1; ctx.strokeStyle= isHover? C.ink3 : hero? col : C.rule; }
    roundRect(x,y,hw,hh,rad); ctx.stroke(); ctx.setLineDash([]);
    const cited=inDegree(p.id);
    const fs=12.5*s*(hero?1.04:1);
    if(fs>=6){
      const padL=x+12*s, right=x+hw-9*s;
      const badgeW= cited>0 && s>0.4 ? (String(cited).length*6+10)*s : 0;
      ctx.textAlign="left"; ctx.textBaseline="top";
      ctx.font=font(600,fs,SERIF);
      ctx.fillStyle= hero? inkFor(col) : (hasNote? C.ink : C.ink2);
      const tlines=wrapLines(p.title||"Untitled",right-padL-(badgeW?badgeW+4*s:0),2);
      let ty=y+(hero?7:9)*s;
      for(const ln of tlines){ ctx.fillText(ln,padL,ty); ty+=fs*1.2; }
      /* bottom line: authors on the left, year (and status) on the right */
      const ms=10.5*s, by=y+hh-ms-8*s;
      let rx=right;
      if(p.status && p.status!=="toread"){ const d=Math.max(3,3.6*s);
        ctx.beginPath(); ctx.arc(rx-d, by+ms*0.55, d, 0, 6.283); ctx.fillStyle= p.status==="read"?C.read:C.skimmed; ctx.fill(); rx-=d*2+5*s; }
      ctx.font=font(0,ms,SANS);
      if(p.year){ ctx.textAlign="right"; ctx.fillStyle=C.ink3; ctx.fillText(String(p.year),rx,by); rx-=ctx.measureText(String(p.year)).width+8*s; }
      ctx.textAlign="left"; ctx.fillStyle= hero? C.ink2 : C.ink2;
      const aln=wrapLines(p.authors||"No authors",Math.max(10,rx-padL),1);
      ctx.fillText(aln[0]||"",padL,by);
      if(badgeW){
        const bh=15*s, bx=right-badgeW, byy=y+8*s;
        ctx.fillStyle= hero? inkFor(col) : (hasNote? col : C.paleStripe); roundRect(bx,byy,badgeW,bh,bh/2); ctx.fill();
        ctx.fillStyle= hero? col : "#fff"; ctx.font=font(600,9.5*s,SANS); ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(String(cited),bx+badgeW/2,byy+bh/2+.5*s);
      }
    } else if(!dim && hw>28){
      /* too small for the full card: a short author-year tag keeps papers identifiable */
      const fa=firstAuthor(p)||(p.title||"Untitled").split(" ")[0];
      ctx.font=font(500,9,SANS); ctx.textAlign="center"; ctx.textBaseline="middle";
      let tag=fa+(p.year?" ’"+String(p.year).slice(-2):"");
      if(ctx.measureText(tag).width>hw-8) tag=fa;
      while(tag.length>2 && ctx.measureText(tag).width>hw-8) tag=tag.slice(0,-2)+"…";
      ctx.fillStyle= hero? inkFor(col) : (hasNote? C.ink : C.ink2);
      ctx.fillText(tag, cx+(hero?0:2*s), hero? y+hh*0.28 : cy);
    }
    ctx.globalAlpha=1;
  }
  /* link notes, placed to avoid papers and each other */
  if(labelJobs.length){
    ctx.font=font(0,11,SANS);
    const placed=[];
    const overlaps=(a,b)=>!(a[0]+a[2]<b[0]||b[0]+b[2]<a[0]||a[1]+a[3]<b[1]||b[1]+b[3]<a[1]);
    labelJobs.sort((a,b)=>((b.sel||b.lblMatch||b.hov||b.e.pin)?1:0)-((a.sel||a.lblMatch||a.hov||a.e.pin)?1:0));
    for(const job of labelJobs){
      const {e,pts,sel,lblMatch,hov}=job;
      const must=sel||lblMatch||hov||e.pin;
      let txt=e.label; if(txt.length>40) txt=txt.slice(0,39)+"…";
      const tw=ctx.measureText(txt).width, pad=7, ph=19, pw=tw+pad*2;
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
          const qq=at(t);
          const steep=Math.abs(qq.ang)>0.72;
          const drawAng= steep? 0 : qq.ang;
          const lx=qq.x+off*Math.sin(qq.ang), ly=qq.y-off*Math.cos(qq.ang);
          const bw=pw*Math.abs(Math.cos(drawAng))+ph*Math.abs(Math.sin(drawAng));
          const bh=pw*Math.abs(Math.sin(drawAng))+ph*Math.abs(Math.cos(drawAng));
          const box=[lx-bw/2,ly-bh/2,bw,bh];
          let score=0;
          for(const rc of placed){ if(overlaps(box,rc)){ score+=100; if(score>=bestScore) break; } }
          if(score<bestScore){ for(const rc of nodeRects){ if(overlaps(box,rc)){ score+=25; if(score>=bestScore) break; } } }
          if(score<bestScore){ bestScore=score; best={x:lx,y:ly,ang:drawAng,box,ex:qq.x,ey:qq.y}; if(!score) break outer; }
        }
      }
      if(!best) continue;
      if(bestScore>0 && !must) continue; // no clean spot: shown on hover, select or pin
      placed.push(best.box);
      const strong=sel||hov;
      ctx.strokeStyle= strong? C.accent : "rgba(85,97,92,.45)"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(best.ex,best.ey); ctx.lineTo(best.x,best.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(best.ex,best.ey,2,0,6.283); ctx.fillStyle=ctx.strokeStyle; ctx.fill();
      ctx.save(); ctx.translate(best.x,best.y); ctx.rotate(best.ang);
      ctx.fillStyle= lblMatch? C.marker : e.pin? C.markerSoft : C.surface;
      ctx.strokeStyle= strong? C.accent : (lblMatch||e.pin)? C.markerEdge : C.rule;
      ctx.lineWidth= strong?1.5:1;
      roundRect(-pw/2,-ph/2,pw,ph,4); ctx.fill(); ctx.stroke();
      ctx.fillStyle= strong||lblMatch? C.ink : C.ink2; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(txt,0,0.5);
      ctx.restore();
    }
  }
  if((linkMode||shiftDown) && linkFirst && curMouse){
    const p=byId(linkFirst); if(p){ const [x1,y1]=w2s(p.x,p.y);
      ctx.strokeStyle=C.accent; ctx.setLineDash([6,5]); ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(curMouse[0],curMouse[1]); ctx.stroke(); ctx.setLineDash([]); }
  }
  if(band){
    const bx0=Math.min(band[0],band[2]), by0=Math.min(band[1],band[3]);
    const bw=Math.abs(band[2]-band[0]), bh=Math.abs(band[3]-band[1]);
    ctx.fillStyle="rgba(30,106,80,.06)"; ctx.fillRect(bx0,by0,bw,bh);
    ctx.strokeStyle="rgba(30,106,80,.8)"; ctx.setLineDash([5,4]); ctx.lineWidth=1.25;
    ctx.strokeRect(bx0,by0,bw,bh); ctx.setLineDash([]);
  }
  if(snapGuides && dragging){
    ctx.strokeStyle="rgba(30,106,80,.55)"; ctx.setLineDash([4,4]); ctx.lineWidth=1;
    if(snapGuides.x!=null){ const gx=w2s(snapGuides.x,0)[0]; ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
    if(snapGuides.y!=null){ const gy=w2s(0,snapGuides.y)[1]; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }
    ctx.setLineDash([]);
  }
}

