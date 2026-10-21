
"use strict";
/* ============================ BibLaTeX parser ============================ */
function stripBraces(s){
  if(s==null) return "";
  s=String(s);
  s=s.replace(/\\['`^"~=.]\{?(\w)\}?/g,"$1")
     .replace(/\{\\(?:ss)\}/g,"ss").replace(/\\&/g,"&").replace(/\\%/g,"%")
     .replace(/\\\$/g,"$").replace(/\\_/g,"_").replace(/~/g," ")
     .replace(/\\(?:textbf|textit|emph|mathrm|text)\b/g,"");
  s=s.replace(/[{}]/g,"");
  return s.replace(/\s+/g," ").trim();
}
function parseBib(str){
  const entries=[]; let i=0; const n=str.length;
  function skipWs(){ while(i<n && /\s/.test(str[i])) i++; }
  while(i<n){
    while(i<n && str[i]!=='@') i++;
    if(i>=n) break;
    i++;
    let type=""; while(i<n && /[A-Za-z]/.test(str[i])) type+=str[i++];
    type=type.toLowerCase();
    skipWs();
    if(str[i]!=='{'){ continue; }
    i++;
    if(type==='comment'||type==='preamble'||type==='string'){
      let d=1; while(i<n&&d>0){ if(str[i]==='{')d++; else if(str[i]==='}')d--; i++; }
      continue;
    }
    let key=""; while(i<n && str[i]!==',' && str[i]!=='}') key+=str[i++];
    key=key.trim();
    const fields={};
    while(i<n && str[i]!=='}'){
      if(str[i]===','){ i++; continue; }
      skipWs();
      if(str[i]==='}') break;
      let name=""; while(i<n && /[A-Za-z0-9_+\-]/.test(str[i])) name+=str[i++];
      name=name.toLowerCase().trim();
      skipWs();
      if(str[i]!=='='){ while(i<n && str[i]!=='}') i++; break; }
      i++; skipWs();
      let val="";
      if(str[i]==='{'){
        let d=1; i++;
        while(i<n&&d>0){ const c=str[i]; if(c==='{')d++; else if(c==='}'){d--; if(d===0){i++;break;}} val+=c; i++; }
      } else if(str[i]==='"'){
        i++; let d=0;
        while(i<n){ const c=str[i]; if(c==='{')d++; else if(c==='}')d--; else if(c==='"'&&d===0){i++;break;} val+=c; i++; }
      } else {
        while(i<n && str[i]!==',' && str[i]!=='}') val+=str[i++];
      }
      if(name) fields[name]=val.trim();
    }
    if(str[i]==='}') i++;
    if(key) entries.push({type,key,fields});
  }
  return entries;
}
function authorsFromBib(raw){
  if(!raw) return "";
  return raw.split(/\s+and\s+/i).map(a=>{
    a=stripBraces(a);
    if(a.includes(",")){ const p=a.split(","); return (p[1]||"").trim()+" "+(p[0]||"").trim(); }
    return a;
  }).join(", ").trim();
}
function entryToPaper(e){
  const f=e.fields;
  return {
    key:e.key,
    title:stripBraces(f.title||f.booktitle||"Untitled"),
    authors:authorsFromBib(f.author||f.editor||""),
    year:stripBraces(f.year||f.date||"").slice(0,4),
    venue:stripBraces(f.journal||f.journaltitle||f.booktitle||f.publisher||f.eprinttype||""),
    doi:stripBraces(f.doi||f.url||(f.eprint?("arXiv:"+f.eprint):"")),
    abstract:stripBraces(f.abstract||""),
    note:""
  };
}
function bibAuthors(a){ if(!a) return "";
  return a.split(",").map(s=>{ s=s.trim(); if(!s) return ""; const i=s.lastIndexOf(" ");
    return i<0? s : (s.slice(i+1)+", "+s.slice(0,i)); }).filter(Boolean).join(" and "); }
function bibField(name,val){ if(!val) return ""; return `,\n  ${name} = {${String(val).replace(/[{}]/g,"")}}`; }
function bibKey(p,used){ let k=(p.key||"").trim();
  if(!k){ const last=((p.authors||"anon").split(",")[0].trim().split(" ").pop())||"anon"; k=(last+(p.year||"")).replace(/[^A-Za-z0-9]/g,"")||"ref"; }
  let base=k,n=2; while(used.has(k)){ k=base+"_"+(n++); } used.add(k); return k; }
function toBib(){ const used=new Set();
  return state.papers.map(p=>{ const k=bibKey(p,used);
    const v=(p.venue||""); const type= /arxiv|preprint/i.test(v)?"misc": (/(proc|conf|symp|workshop|meeting)/i.test(v)?"inproceedings":"article");
    let s=`@${type}{${k}`;
    s+=bibField("title",p.title);
    s+=bibField("author",bibAuthors(p.authors));
    s+=bibField("year",p.year);
    s+= (type==="inproceedings") ? bibField("booktitle",v) : (type==="article"? bibField("journal",v) : bibField("howpublished",v));
    if(/^10\./.test(p.doi||"")) s+=bibField("doi",p.doi);
    else if(/^https?:/i.test(p.doi||"")) s+=bibField("url",p.doi);
    else if(/^arxiv:/i.test(p.doi||"")){ s+=bibField("eprint",p.doi.replace(/^arxiv:/i,"")); s+=bibField("eprinttype","arxiv"); }
    s+=bibField("note",p.note);
    s+="\n}"; return s; }).join("\n\n")+"\n"; }

