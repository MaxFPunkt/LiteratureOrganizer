/* ============================ OpenAlex (auto-link & metadata) ============================ */
const OA="https://api.openalex.org", OA_MAILTO="mailto=litnet-app@proton.me";
function realDoi(v){
  const d=normDoi(v);
  if(/^10\./.test(d)) return d;
  const m=String(v||"").match(/arxiv:\s*([0-9]{4}\.[0-9]{4,5})(v\d+)?/i);
  return m? "10.48550/arxiv."+m[1] : null;
}
function oaMatchRefs(results,cand){
  // returns {byOaId: Map(openalexId -> paper), refs: Map(paperId -> [openalexIds])}
  const byOaId=new Map(), refs=new Map();
  for(const w of results){ const nd=normDoi(w.doi);
    const hit=cand.find(x=>x.doi===nd);
    if(hit){ byOaId.set(w.id,hit.p); refs.set(hit.p.id,w.referenced_works||[]); } }
  return {byOaId,refs};
}
function oaCountLinks(byOaId,refs){
  const links=[];
  for(const [pid,rw] of refs){ for(const r of rw){
    const t=byOaId.get(r); if(t && t.id!==pid && !hasEdge(pid,t.id)) links.push([pid,t.id]); } }
  return links;
}
async function runAutoLink(){
  const cand=state.papers.map(p=>({p,doi:realDoi(p.doi)})).filter(x=>x.doi);
  if(cand.length<2){ toast("Finding links needs at least two papers with a DOI or arXiv ID"); return; }
  toast(`Looking up ${cand.length} papers on OpenAlex…`); const btnA=document.getElementById("btnAdd"); btnA.disabled=true;
  try{
    let allResults=[];
    for(let i=0;i<cand.length;i+=40){
      const batch=cand.slice(i,i+40);
      const url=`${OA}/works?filter=doi:${batch.map(x=>x.doi).join("|")}&select=id,doi,referenced_works&per-page=50&${OA_MAILTO}`;
      const res=await fetch(url);
      if(!res.ok) throw new Error("HTTP "+res.status);
      allResults=allResults.concat((await res.json()).results||[]);
    }
    const {byOaId,refs}=oaMatchRefs(allResults,cand);
    const links=oaCountLinks(byOaId,refs);
    if(!links.length){ toast(`No new links found. OpenAlex recognised ${byOaId.size} of ${cand.length} papers.`); return; }
    pushUndo();
    let n=0; for(const [a,b] of links){ if(addEdge(a,b)) n++; }
    save(); updateStats(); renderSide(); requestDraw();
    toast(`Added ${n} citation link${n===1?"":"s"}. OpenAlex recognised ${byOaId.size} of ${cand.length} papers.`);
  }catch(err){ console.warn(err); toast("Could not reach OpenAlex. Check your internet connection and try again."); }
  finally{ btnA.disabled=false; }
}
async function fetchDoiMeta(){
  const doi=realDoi(document.getElementById("pDoi").value);
  if(!doi){ toast("Enter a DOI or arXiv ID first, for example 10.1145/3292500"); return; }
  const btn=document.getElementById("pFetch"); const orig=btn.innerHTML; btn.disabled=true; btn.querySelector(".lbl").textContent="Fetching…";
  try{
    const res=await fetch(`${OA}/works/doi:${doi}?${OA_MAILTO}`);
    if(!res.ok){ toast("OpenAlex has no record for that DOI"); return; }
    const w=await res.json();
    const fill=(id,v)=>{ const el=document.getElementById(id); if(v && !el.value.trim()) el.value=v; };
    fill("pTitle", w.title||"");
    fill("pAuthors",(w.authorships||[]).map(a=>a.author&&a.author.display_name).filter(Boolean).join(", "));
    fill("pYear", w.publication_year? String(w.publication_year):"");
    fill("pVenue", (w.primary_location&&w.primary_location.source&&w.primary_location.source.display_name)||"");
    toast("Filled in the empty fields from OpenAlex");
  }catch(err){ console.warn(err); toast("Could not reach OpenAlex. Check your internet connection."); }
  finally{ btn.disabled=false; btn.innerHTML=orig; }
}
document.getElementById("pFetch").onclick=fetchDoiMeta;
