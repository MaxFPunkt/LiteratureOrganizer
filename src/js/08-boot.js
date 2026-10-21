/* ============================ Boot ============================ */
/* Demo papers appear only on the very first visit, never after "New library". */
function seedDemo(){
  const a=addPaper({key:"vaswani17",title:"Attention Is All You Need",authors:"Ashish Vaswani, Noam Shazeer",year:"2017",venue:"NeurIPS",doi:"arXiv:1706.03762",abstract:"",note:"Introduces the Transformer; self-attention replaces recurrence. The backbone for most later NLP work.",status:"read"});
  const b=addPaper({key:"devlin18",title:"BERT: Pre-training of Deep Bidirectional Transformers",authors:"Jacob Devlin, Ming-Wei Chang",year:"2018",venue:"NAACL",doi:"arXiv:1810.04805",abstract:"",note:""});
  addPaper({key:"he16",title:"Deep Residual Learning for Image Recognition",authors:"Kaiming He, Xiangyu Zhang",year:"2016",venue:"CVPR",doi:"arXiv:1512.03385",abstract:"",note:"ResNet: skip connections make very deep networks trainable.",status:"skimmed"});
  addEdge(b.id,a.id); const e=findEdge(b.id,a.id); if(e) e.label="builds on the Transformer encoder";
  addEdge(a.id,state.papers[2].id); const e2=findEdge(a.id,state.papers[2].id); if(e2) e2.label="residual connections in every block";
}
const hadLibrary=load();
resize();
if(!hadLibrary) seedDemo();
updateStats(); updateFileName(); updateHint(); setLinkBtn(); setLabelsBtn(); setShapeBtn(); setSideBtn(true); renderSide();
if(isNarrow()) panelHide();
if(state.papers.length && state.papers.every(p=>p.x===0||p.x==null)) arrange();
else { fit(); if(lastLayout==="circle" && state.papers.length) heb=buildHEB(currentCircularOrder()); }
if(!hadLibrary){ arrange(); flushSave(); }
undoStack.length=0; redoStack.length=0;
requestDraw();
markClean();
