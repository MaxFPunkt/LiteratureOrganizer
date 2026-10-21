/* ============================ Boot ============================ */
function seedIfEmpty(){
  if(state.papers.length) return;
  const a=addPaper({key:"vaswani17",title:"Attention Is All You Need",authors:"Ashish Vaswani, Noam Shazeer",year:"2017",venue:"NeurIPS",doi:"arXiv:1706.03762",abstract:"",note:"Introduces the Transformer; self-attention replaces recurrence — the backbone for most later NLP work."});
  const b=addPaper({key:"devlin18",title:"BERT: Pre-training of Deep Bidirectional Transformers",authors:"Jacob Devlin, Ming-Wei Chang",year:"2018",venue:"NAACL",doi:"arXiv:1810.04805",abstract:"",note:""});
  const c=addPaper({key:"he16",title:"Deep Residual Learning for Image Recognition",authors:"Kaiming He, Xiangyu Zhang",year:"2016",venue:"CVPR",doi:"arXiv:1512.03385",abstract:"",note:"ResNet — skip connections enable very deep nets."});
  addEdge(b.id,a.id); const e=findEdge(b.id,a.id); if(e) e.label="builds on the Transformer encoder";
}
load(); resize(); seedIfEmpty(); updateStats(); updateFileName(); updateHint(); setLinkBtn(); setLabelsBtn(); setShapeBtn(); renderSide();
if(isNarrow()) panelHide();
if(state.papers.every(p=>p.x===0||p.x==null)) arrange();
else { fit(); if(lastLayout==="circle" && state.papers.length) heb=buildHEB(currentCircularOrder()); }
requestDraw();
markClean();

