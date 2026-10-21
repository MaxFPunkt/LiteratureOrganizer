/* ============================ Layout algorithms ============================ */
function finalizeLayout(){ save(); fit(); requestDraw(); }
function layoutRadial(){
  if(!state.papers.length) return;
  pushUndo();
  const ids=state.papers.map(p=>p.id);
  const adj={}, outDeg={};
  ids.forEach(id=>{ adj[id]=new Set(); outDeg[id]=0; });
  for(const e of state.edges){ if(adj[e.from]&&adj[e.to]){ adj[e.from].add(e.to); adj[e.to].add(e.from); outDeg[e.from]++; } }
  let center=ids[0];
  for(const id of ids){ if(outDeg[id]>outDeg[center] || (outDeg[id]===outDeg[center] && adj[id].size>adj[center].size)) center=id; }
  const ring={}; ring[center]=0; const q=[center];
  while(q.length){ const u=q.shift(); for(const v of adj[u]){ if(ring[v]==null){ ring[v]=ring[u]+1; q.push(v); } } }
  let maxR=0; ids.forEach(id=>{ if(ring[id]!=null) maxR=Math.max(maxR,ring[id]); });
  const discon=ids.filter(id=>ring[id]==null);
  if(discon.length){ maxR++; discon.forEach(id=>ring[id]=maxR); }
  const rings=[]; for(let r=0;r<=maxR;r++) rings[r]=[];
  ids.forEach(id=>rings[ring[id]].push(id));
  const minArc=210, ringGap=240, radius=[];
  for(let r=0;r<=maxR;r++){ const c=rings[r].length; const need=c>1? (c*minArc)/(2*Math.PI):0; radius[r]= r===0?0: Math.max(r*ringGap, need); }
  const ang={}, bc={};
  for(let r=1;r<=maxR;r++){ const arr=rings[r]; arr.forEach((id,i)=>ang[id]=(i/arr.length)*2*Math.PI); }
  const cmean=list=>{ let sx=0,sy=0,n=0; for(const a of list){ sx+=Math.cos(a); sy+=Math.sin(a); n++; } return n? Math.atan2(sy,sx):null; };
  for(let pass=0;pass<6;pass++){
    const inward=(pass%2===0);
    const seq=[]; for(let k=1;k<=maxR;k++) seq.push(inward? k : maxR-k+1);
    for(const r of seq){ const arr=rings[r]; if(arr.length<=1) continue;
      const ref= inward? r-1 : r+1;
      arr.forEach(id=>{ const nb=[...adj[id]].filter(v=>ring[v]===ref).map(v=>ang[v]); const m=cmean(nb); bc[id]= m!=null? m : ang[id]; });
      arr.sort((a,b)=>bc[a]-bc[b]);
      const center0=cmean(arr.map(id=>bc[id]))||0; const step=2*Math.PI/arr.length;
      arr.forEach((id,i)=>{ ang[id]= center0 + (i-(arr.length-1)/2)*step; });
    }
  }
  const cp=byId(center); if(cp){ cp.x=0; cp.y=0; }
  for(let r=1;r<=maxR;r++){ for(const id of rings[r]){ const p=byId(id); p.x=radius[r]*Math.cos(ang[id]); p.y=radius[r]*Math.sin(ang[id]); } }
  finalizeLayout();
}
function layoutLayered(){
  if(!state.papers.length) return; pushUndo();
  const layer={}, visiting={};
  function L(id){ if(layer[id]!=null) return layer[id]; if(visiting[id]) return 0; visiting[id]=true;
    let mx=-1; for(const e of state.edges){ if(e.from===id) mx=Math.max(mx,L(e.to)); } visiting[id]=false; return layer[id]=mx+1; }
  state.papers.forEach(p=>L(p.id));
  const layers={}; let maxL=0;
  state.papers.forEach(p=>{ const l=layer[p.id]; (layers[l]=layers[l]||[]).push(p); maxL=Math.max(maxL,l); });
  for(let pass=0;pass<4;pass++){
    for(let l=1;l<=maxL;l++){ const arr=layers[l]; if(!arr) continue;
      const pos={}; (layers[l-1]||[]).forEach((p,idx)=>pos[p.id]=idx);
      arr.forEach(p=>{ const nb=state.edges.filter(e=>e.from===p.id&&pos[e.to]!=null).map(e=>pos[e.to]); p._bc= nb.length? nb.reduce((a,b)=>a+b,0)/nb.length : 1e9; });
      arr.sort((a,b)=>a._bc-b._bc);
    }
  }
  const colGap=240, rowGap=92;
  for(let l=0;l<=maxL;l++){ const arr=layers[l]; if(!arr) continue; const h=(arr.length-1)*rowGap;
    arr.forEach((p,idx)=>{ p.x=l*colGap; p.y=idx*rowGap - h/2; delete p._bc; }); }
  finalizeLayout();
}
function layoutCircle(){
  if(!state.papers.length) return; pushUndo();
  const ids=state.papers.map(p=>p.id); const n=ids.length;
  const adj={}; ids.forEach(id=>adj[id]=new Set());
  for(const e of state.edges){ if(adj[e.from]&&adj[e.to]){ adj[e.from].add(e.to); adj[e.to].add(e.from); } }
  const ang={}; ids.forEach((id,i)=>ang[id]=(i/n)*2*Math.PI);
  const cmean=list=>{ let sx=0,sy=0,k=0; for(const a of list){ sx+=Math.cos(a); sy+=Math.sin(a); k++; } return k? Math.atan2(sy,sx):null; };
  for(let pass=0;pass<24;pass++){
    const bc={}; ids.forEach(id=>{ const nb=[...adj[id]].map(v=>ang[v]); const m=cmean(nb); bc[id]= m!=null? m : ang[id]; });
    const order=[...ids].sort((a,b)=>bc[a]-bc[b]);
    order.forEach((id,i)=>ang[id]=(i/n)*2*Math.PI);
  }
  const minArc=210, R=Math.max(260,(n*minArc)/(2*Math.PI));
  ids.forEach(id=>{ const p=byId(id); p.x=R*Math.cos(ang[id]); p.y=R*Math.sin(ang[id]); });
  const ord=[...ids].sort((a,b)=>ang[a]-ang[b]);
  heb=buildHEB(ord);
  finalizeLayout();
}
function layoutGrid(){
  if(!state.papers.length) return; pushUndo();
  const arr=[...state.papers].sort((a,b)=> (inDegree(b.id)-inDegree(a.id)) || String(b.year).localeCompare(String(a.year)));
  const n=arr.length, cols=Math.max(1,Math.ceil(Math.sqrt(n))), rows=Math.ceil(n/cols); const gx=230, gy=130;
  arr.forEach((p,i)=>{ const r=Math.floor(i/cols), c=i%cols; p.x=c*gx-(cols-1)*gx/2; p.y=r*gy-(rows-1)*gy/2; });
  finalizeLayout();
}
function layoutForce(){
  if(!state.papers.length) return; pushUndo();
  const P=state.papers, N=P.length;
  P.forEach(p=>{ p.x=(Math.random()-.5)*Math.max(600,N*20); p.y=(Math.random()-.5)*Math.max(400,N*16); p.vx=0; p.vy=0; });
  const rep=42000, spring=0.02, rest=200, damp=0.85, iters= N>250?150:300;
  for(let it=0; it<iters; it++){
    for(let i=0;i<N;i++){ const p=P[i]; let fx=0,fy=0;
      for(let j=0;j<N;j++){ if(i===j) continue; const qd=P[j];
        let dx=p.x-qd.x, dy=p.y-qd.y; let d2=dx*dx+dy*dy; if(d2<1){ d2=1; dx=Math.random(); dy=Math.random(); }
        const d=Math.sqrt(d2), f=rep/d2; fx+=dx/d*f; fy+=dy/d*f; }
      fx-=p.x*0.02; fy-=p.y*0.02; p._fx=fx; p._fy=fy; }
    for(const e of state.edges){ const p=byId(e.from), qd=byId(e.to); if(!p||!qd) continue;
      let dx=qd.x-p.x, dy=qd.y-p.y; const d=Math.hypot(dx,dy)||1; const f=spring*(d-rest);
      p._fx+=dx/d*f; p._fy+=dy/d*f; qd._fx-=dx/d*f; qd._fy-=dy/d*f; }
    for(let i=0;i<N;i++){ const p=P[i]; p.vx=(p.vx+p._fx*0.05)*damp; p.vy=(p.vy+p._fy*0.05)*damp; p.x+=p.vx; p.y+=p.vy; }
  }
  P.forEach(p=>{ delete p.vx; delete p.vy; delete p._fx; delete p._fy; });
  finalizeLayout();
}
function layoutTimeline(){
  if(!state.papers.length) return; pushUndo();
  const yr=p=>{ const m=String(p.year||"").match(/\d{4}/); return m? +m[0] : null; };
  const groups=new Map();
  for(const p of state.papers){ const y=yr(p); const k=(y==null)?"?":y;
    if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(p); }
  const keys=[...groups.keys()].sort((a,b)=>{
    if(a==="?") return 1; if(b==="?") return -1; return a-b; });
  const gx=CARDW+80, gy=CARDH+42;
  keys.forEach((k,ci)=>{
    const col=groups.get(k).sort((a,b)=>inDegree(b.id)-inDegree(a.id));
    col.forEach((p,ri)=>{ p.x=ci*gx-(keys.length-1)*gx/2; p.y=ri*gy-(col.length-1)*gy/2; });
  });
  finalizeLayout();
}
const LAYOUTS=[
  {id:"radial", name:"Radial", desc:"The most-citing paper in the centre, rings by citation distance", fn:layoutRadial},
  {id:"layered",name:"Layered", desc:"Left to right by citation depth", fn:layoutLayered},
  {id:"circle", name:"Single circle", desc:"One ring, links bundled together", fn:layoutCircle},
  {id:"grid",   name:"Grid", desc:"Rows and columns, most cited first", fn:layoutGrid},
  {id:"force",  name:"Force-directed", desc:"Organic clusters, computed once", fn:layoutForce},
  {id:"timeline",name:"Timeline", desc:"Columns by year, oldest first", fn:layoutTimeline},
];
function runLayout(id){ const L=LAYOUTS.find(x=>x.id===id); if(L){ lastLayout=id; heb=null; L.fn(); renderLayoutMenu(); } }
function arrange(){ runLayout(lastLayout||"radial"); }

/* ============================ Bookmarks ============================ */
function saveBookmark(name){
  if(!state.papers.length) return;
  name=(name||"").trim() || ("Layout "+(bookmarks.length+1));
  const pos={}; state.papers.forEach(p=>pos[p.id]=[Math.round(p.x),Math.round(p.y)]);
  bookmarks.push({name,ts:Date.now(),pos}); save(); renderLayoutMenu();
}
function restoreBookmark(i){ const b=bookmarks[i]; if(!b) return; pushUndo();
  state.papers.forEach(p=>{ const c=b.pos[p.id]; if(c){ p.x=c[0]; p.y=c[1]; } });
  if(lastLayout==="circle" && state.papers.length) heb=buildHEB(currentCircularOrder());
  save(); fit(); requestDraw(); }
function deleteBookmark(i){ bookmarks.splice(i,1); save(); renderLayoutMenu(); }
