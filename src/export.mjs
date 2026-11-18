import { PDFDocument } from 'pdf-lib';
export function serializeDiagram(svg) {
  const copy=svg.cloneNode(true),[x,y,width,height]=svg.getAttribute('viewBox').split(' ').map(Number);
  copy.setAttribute('width',width);copy.setAttribute('height',height);
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg');
  copy.querySelectorAll('.dimmed,.selected').forEach(e=>e.classList.remove('dimmed','selected'));
  const originals=[svg,...svg.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')];
  for(let i=0;i<originals.length;i++) {
    const style=getComputedStyle(originals[i]);
    for(const attr of ['fill','stroke','stroke-width','font-size','font-weight','text-anchor','stroke-dasharray'])clones[i].setAttribute(attr,style.getPropertyValue(attr));
    clones[i].setAttribute('font-family','Arial, sans-serif');
    clones[i].removeAttribute('tabindex');
  }
  copy.querySelectorAll('.route-handle,.relation-hit').forEach(e=>e.remove());
  const background=document.createElementNS('http://www.w3.org/2000/svg','rect');
  for(const [key,value] of Object.entries({x,y,width,height,fill:'white'}))background.setAttribute(key,value);
  copy.prepend(background);
  return {text:new XMLSerializer().serializeToString(copy),width,height};
}
export async function diagramFile(svg,format) {
  const {text,width,height}=serializeDiagram(svg);
  if(format==='svg')return new Blob([text],{type:'image/svg+xml'});
  const scale=Math.min(2,8192/Math.max(width,height));
  if(width*height*scale*scale>32000000)throw Error('This diagram is too large for image export. Choose SVG, or reduce its layout size.');
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text);await image.decode();
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
  const context=canvas.getContext('2d');if(!context)throw Error('Image export is unavailable. Choose SVG or reopen this preview.');
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const png=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Image export failed. Try SVG.')),'image/png'));
  if(format==='png')return png;
  if(format!=='pdf')throw Error('Choose PNG, PDF or SVG for diagram export.');
  const pdf=await PDFDocument.create(),embedded=await pdf.embedPng(await png.arrayBuffer());
  const ratio=Math.min(1,14400/Math.max(width,height));const page=pdf.addPage([width*ratio,height*ratio]);
  page.drawImage(embedded,{x:0,y:0,width:width*ratio,height:height*ratio});
  return new Blob([await pdf.save()],{type:'application/pdf'});
}
export function downloadFile(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
