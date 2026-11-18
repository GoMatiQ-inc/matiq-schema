import { parseSchema, importSchema, exportSchema, errorText, diagnostics, importFormats, exportFormats } from './schema.mjs';
import { TABLE_WIDTH, HEADER_HEIGHT, ROW_HEIGHT, tableHeight, cardinality, connection } from './diagram.mjs';
import { serializeDiagram, diagramFile, downloadFile } from './export.mjs';
import { sample } from './sample.mjs';
const $ = selector => document.querySelector(selector);
const source = $('#source'), canvas = $('#diagram'), status = $('#parse-status');
let model, positions = {}, bends = {}, selectedRef = null, selected = null, zoom = 1, dirty = false, mode = 'import';
let preferences = {spacing:'comfortable', types:true, grid:true};
const savedLabel=window.tool.native?'Saved on this device':'Saved in this browser';
document.body.dataset.dirty='false';
if(window.tool.native){$('.preview-label').hidden=true;$('#page-projects .caption').textContent='Your current project is saved locally. Export DBML to keep named backups or switch schemas with Import.';$('#page-settings p:last-child').textContent='Schema editing and file processing stay on your device. No model download is needed.';}
const SVG = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, text, parent = canvas) {
  const el = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  parent.append(el); return el;
}
function markDirty() { dirty = true;document.body.dataset.dirty='true'; $('#save-state').textContent = 'Unsaved changes'; $('#settings-state').textContent = 'Unsaved changes'; }
function navigate(page) {
  for (const id of ['diagram','projects','settings']) $('#page-'+id).hidden = page !== id;
  for (const b of document.querySelectorAll('.sidebar nav button')) {
    b.classList.toggle('active', b.dataset.page === page);
    b.setAttribute('aria-current', b.dataset.page === page ? 'page' : 'false');
  }
  if (page === 'projects') $('#recent-title').textContent = $('#project-name').value || 'Untitled schema';
}
for (const b of document.querySelectorAll('.sidebar nav button')) b.onclick = () => navigate(b.dataset.page);
function layout() {
  if (!model) return;
  const gap = preferences.spacing === 'compact' ? 55 : 95;
  // Stable three-column rows; preserve dragged positions until Auto layout is chosen.
  let y = 45;
  for (let i = 0; i < model.tables.length; i += 3) {
    const row = model.tables.slice(i,i+3);
    row.forEach((t,j) => positions[t.key] = {x:40+j*(TABLE_WIDTH+gap),y});
    y += Math.max(...row.map(t=>tableHeight(t))) + gap;
  }
}
function reveal(range) {
  if(!range || status.className==='error')return;
  source.focus();source.setSelectionRange(range.start.offset,range.end.offset);
  source.scrollTop=Math.max(0,(range.start.line-3)*22);syncEditorScroll();
}
const refKey = ref => ref.endpoints.map(e=>e.key+'.'+e.fieldNames.join(',')+':'+e.relation).join('|');
function drag(event, move) {
  event.preventDefault();event.stopPropagation();markDirty();canvas.setPointerCapture(event.pointerId);
  const rect=canvas.getBoundingClientRect(), box={width:canvas.viewBox.baseVal.width,height:canvas.viewBox.baseVal.height};
  canvas.onpointermove=e=>{move({x:(e.clientX-event.clientX)*box.width/rect.width,y:(e.clientY-event.clientY)*box.height/rect.height});render();};
  const finish=()=>{canvas.onpointermove=null;canvas.onpointerup=null;canvas.onpointercancel=null;markDirty();};
  canvas.onpointerup=finish;canvas.onpointercancel=finish;
}
function inspect(key) {
  selectedRef=null;
  selected = key; const t = model.tables.find(t=>t.key===key);
  $('#inspector').hidden = !t;
  if (t) {
    reveal(t.sourceRange);
    $('#table-title').textContent = t.key;
    $('#table-detail').textContent = t.fields.map(f=>`${f.pk?'PK · ':''}${f.name}  ${f.type.type_name}${f.not_null?' · required':''}${f.unique?' · unique':''}`).join('\n') + (t.note ? '\n\n'+t.note : '');
    $('#selection').textContent = `${t.name} · ${t.fields.length} columns`;
  }
  render();
}
function render() {
  if (!model) return;
  canvas.replaceChildren();
  const q = $('#search').value.trim().toLowerCase();
  let width = 800, height = 500;
  for (const t of model.tables) {
    if (!positions[t.key]) positions[t.key] = {x:40+(model.tables.indexOf(t)%3)*375,y:50+Math.floor(model.tables.indexOf(t)/3)*300};
    width=Math.max(width,positions[t.key].x+TABLE_WIDTH+65); height=Math.max(height,positions[t.key].y+90+t.fields.length*26);
  }
  for(const bend of Object.values(bends)){if(bend.axis==='x')width=Math.max(width,bend.value+40);else height=Math.max(height,bend.value+40);}
  canvas.setAttribute('viewBox',`0 0 ${width} ${height}`);
  canvas.setAttribute('width',Math.round(width*zoom));canvas.setAttribute('height',Math.round(height*zoom));
  $('#zoom-label').value = `${Math.round(zoom*100)}%`;
  const ends=[];
  const portGroups=new Map(),portOffsets=new Map();
  for(const ref of model.refs)for(const endpoint of ref.endpoints){const key=endpoint.key+'.'+endpoint.fieldNames[0];if(!portGroups.has(key))portGroups.set(key,[]);portGroups.get(key).push(endpoint);}
  for(const group of portGroups.values())group.forEach((endpoint,i)=>portOffsets.set(endpoint,{offset:group.length===1?0:-8+i*16/(group.length-1),half:group.length===1?6:3.5}));
  for (const r of model.refs) {
    const [a,b] = r.endpoints;
    if(!positions[a.key]||!positions[b.key])continue;
    const route=connection(a,b,model.tables,positions,portOffsets.get(a).offset,portOffsets.get(b).offset,bends[refKey(r)]);
    route.first.half=portOffsets.get(a).half;route.last.half=portOffsets.get(b).half;
    const key=refKey(r),active=selectedRef===key;
    const path=svg('path',{d:route.path,class:'relation'+(active?' selected':'')});
    const hit=svg('path',{d:route.path,class:'relation-hit',tabindex:0,role:'button','aria-label':`Relationship ${a.tableName}.${a.fieldNames.join(',')} to ${b.tableName}.${b.fieldNames.join(',')}`});
    const choose=()=>{selectedRef=key;selected=null;$('#inspector').hidden=true;$('#selection').textContent='Drag a line handle to adjust its route';reveal(r.sourceRange);render();};
    hit.onclick=choose;hit.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();choose();}};
    if(active){
      const candidates=route.points.slice(2,-1).map((p,i)=>({a:route.points[i+1],b:p})).filter(s=>s.a.x!==s.b.x||s.a.y!==s.b.y);
      const segment=candidates.sort((s,t)=>(Math.abs(t.a.x-t.b.x)+Math.abs(t.a.y-t.b.y))-(Math.abs(s.a.x-s.b.x)+Math.abs(s.a.y-s.b.y)))[0];
      if(segment){const axis=segment.a.x===segment.b.x?'x':'y',value=segment.a[axis];
        const handle=svg('circle',{cx:(segment.a.x+segment.b.x)/2,cy:(segment.a.y+segment.b.y)/2,r:6,class:'route-handle',role:'slider',tabindex:0,'aria-label':'Move relationship bend','aria-valuenow':value});
        handle.onpointerdown=e=>drag(e,delta=>{bends[key]={axis,value:Math.max(5,value+delta[axis])};});
        handle.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();bends[key]={axis,value:Math.max(5,value+(['ArrowLeft','ArrowUp'].includes(e.key)?-10:10))};markDirty();render();}};
      }
    }
    if(route.warning)svg('title',{},route.warning,path);
    svg('title',{},`${a.tableName}.${a.fieldNames.join(', ')} (${cardinality(a.relation).label}) → ${b.tableName}.${b.fieldNames.join(', ')} (${cardinality(b.relation).label})`,path);
    ends.push([route.first,a.relation],[route.last,b.relation]);
  }
  for (const t of model.tables) {
    const p=positions[t.key], h=tableHeight(t);
    const g=svg('g',{transform:`translate(${p.x},${p.y})`,class:`table-card${selected===t.key?' selected':''}${q&&!t.key.toLowerCase().includes(q)?' dimmed':''}`,tabindex:0,role:'button','aria-label':`Table ${t.name}, ${t.fields.length} columns`});
    svg('rect',{width:TABLE_WIDTH,height:h,rx:6,class:'table-body'},undefined,g);
    const head=svg('rect',{width:TABLE_WIDTH,height:HEADER_HEIGHT,rx:6,class:'table-head'},undefined,g);
    svg('text',{x:12,y:22,class:'table-name'},t.schema==='public'?t.name:t.key,g);
    t.fields.forEach((f,i)=>{
      const y=52+i*ROW_HEIGHT;
      svg('path',{d:`M 0 ${HEADER_HEIGHT+i*ROW_HEIGHT} H ${TABLE_WIDTH}`,class:'table-cell-rule'},undefined,g);
      svg('text',{x:10,y,class:'table-key'},f.pk?'◆':'',g);
      svg('text',{x:28,y,class:'column-name'},f.name.length>21?f.name.slice(0,20)+'…':f.name,g);
      if(preferences.types) svg('text',{x:TABLE_WIDTH-10,y,'text-anchor':'end',class:'column-type'},f.type.type_name,g);
    });
    svg('path',{d:`M 22 ${HEADER_HEIGHT} V ${h}${preferences.types?` M 174 ${HEADER_HEIGHT} V ${h}`:''}`,class:'table-cell-rule'},undefined,g);
    g.onclick=()=>inspect(t.key);
    g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(t.key);}};
    head.onpointerdown=e=>{const start={...p};drag(e,delta=>{p.x=Math.max(5,start.x+delta.x);p.y=Math.max(5,start.y+delta.y);});};
  }
  for(const [end,relation] of ends)drawEndpoint(end,relation);
}
function drawEndpoint(end,relation) {
  const {many,optional,label}=cardinality(relation),{x,y,direction:d,half=6}=end;
  const g=svg('g',{class:'relation-end','aria-label':label,'data-cardinality':relation});
  svg('title',{},label,g);
  svg('path',{d:many?`M ${x} ${y-half} L ${x+12*d} ${y} L ${x} ${y+half}`:`M ${x+7*d} ${y-half} V ${y+half}`,class:'relationship-symbol'},undefined,g);
  if(optional)svg('circle',{cx:x+22*d,cy:y,r:half===6?4:2.8,class:'relationship-optional'},undefined,g);
  else svg('path',{d:`M ${x+21*d} ${y-half} V ${y+half}`,class:'relationship-symbol'},undefined,g);
}
function compile() {
  showDiagnostics([]);
  try {
    const next=parseSchema(source.value); model=next;
    if (!Object.keys(positions).length) layout();
    render();$('#counts').textContent=`${model.tables.length} tables · ${model.refs.length} relationships`;
    status.className='';status.textContent='Schema valid · Changes are processed on this device.';
  } catch(error) {
    showDiagnostics(diagnostics(error,source.value));
    status.className='error';status.textContent='Fix the DBML to update the diagram: '+errorText(error)+'. Showing the last valid diagram.';
  }
}
let debounce;
source.oninput=()=>{markDirty();clearTimeout(debounce);debounce=setTimeout(compile,250);};
function syncEditorScroll(){
  $('#line-numbers').scrollTop=source.scrollTop;
  $('#code-highlights').scrollTop=source.scrollTop;$('#code-highlights').scrollLeft=source.scrollLeft;
}
function showDiagnostics(items){
  $('#problems').hidden=!items.length;$('#problem-count').textContent=`${items.length} DBML error${items.length===1?'':'s'}`;
  $('#problem-list').replaceChildren();$('#line-numbers').replaceChildren();$('#code-highlights').replaceChildren();
  source.setAttribute('aria-invalid',String(!!items.length));
  const lines=source.value.split('\n');let offset=0;
  lines.forEach((line,i)=>{
    const number=document.createElement('span'),highlight=document.createElement('span');
    number.textContent=String(i+1)+'\n';
    const errors=items.filter(d=>d.line===i+1);
    if(errors.length){number.className='error-line';number.title=errors.map(d=>d.message).join('\n');}
    $('#line-numbers').append(number);
    let cursor=0;
    for(const d of errors.sort((a,b)=>a.start-b.start)){
      const start=Math.max(cursor,d.start-offset),end=Math.min(line.length,Math.max(start+1,d.end-offset));
      highlight.append(document.createTextNode(line.slice(cursor,start)));const mark=document.createElement('mark');mark.textContent=line.slice(start,end)||' ';mark.title=d.message;highlight.append(mark);cursor=end;
    }
    highlight.append(document.createTextNode(line.slice(cursor)+'\n'));$('#code-highlights').append(highlight);offset+=line.length+1;
  });
  for(const d of items){const button=document.createElement('button');button.textContent=`${d.line}:${d.column}  ${d.message}`;button.onclick=()=>{source.focus();source.setSelectionRange(d.start,d.end);source.scrollTop=Math.max(0,(d.line-3)*22);syncEditorScroll();};$('#problem-list').append(button);}
  syncEditorScroll();
}
source.onscroll=syncEditorScroll;
$('#project-name').oninput=markDirty;
$('#search').oninput=render;
$('#arrange').onclick=()=>{bends={};layout();render();markDirty();};
function setZoom(value){zoom=Math.max(.3,Math.min(2,value));render();}
$('#zoom-in').onclick=()=>setZoom(zoom+.1);$('#zoom-out').onclick=()=>setZoom(zoom-.1);
$('#fit').onclick=()=>{
  if (!model) return;
  const max=Math.max(800,...model.tables.map(t=>positions[t.key].x+TABLE_WIDTH+65));
  const maxHeight=Math.max(500,...model.tables.map(t=>positions[t.key].y+90+t.fields.length*26));
  setZoom(Math.min($('#diagram-scroll').clientWidth/max,$('#diagram-scroll').clientHeight/maxHeight));
};
$('#close-inspector').onclick=()=>{selected=null;$('#inspector').hidden=true;$('#selection').textContent='Select a table to inspect it';render();};
$('#syntax').onclick=()=>$('#help').showModal();
$('#open-project').onclick=()=>navigate('diagram');
$('#new-project').onclick=()=>{
  if(dirty&&!confirm('Discard unsaved edits and start a new project?'))return;
  source.value='// Your local database schema\nTable example {\n  id uuid [pk]\n}\n';
  $('#project-name').value='Untitled schema';positions={};bends={};selectedRef=null;selected=null;$('#inspector').hidden=true;compile();markDirty();navigate('diagram');
};
function applyPreferences() {
  $('#spacing').value=preferences.spacing;$('#show-types').checked=preferences.types;$('#show-grid').checked=preferences.grid;
  $('#diagram-scroll').classList.toggle('no-grid',!preferences.grid);render();
}
$('#spacing').onchange=()=>{preferences.spacing=$('#spacing').value;markDirty();};
$('#show-types').onchange=()=>{preferences.types=$('#show-types').checked;applyPreferences();markDirty();};
$('#show-grid').onchange=()=>{preferences.grid=$('#show-grid').checked;applyPreferences();markDirty();};
async function saveProject() {
  $('#save').disabled=true;
  try {const snapshot=JSON.stringify({name:$('#project-name').value,source:source.value,positions,bends,preferences});await window.tool.request('save',JSON.parse(snapshot));if(snapshot===JSON.stringify({name:$('#project-name').value,source:source.value,positions,bends,preferences})){dirty=false;document.body.dataset.dirty='false';$('#save-state').textContent=savedLabel;$('#recent-detail').textContent='DBML · Saved project';$('#settings-state').textContent=savedLabel;}}
  catch(error){$('#save-state').textContent='Save failed: '+error.message;$('#settings-state').textContent='Save failed: '+error.message;}
  finally{$('#save').disabled=false;}
};
$('#save').onclick=saveProject;
$('#save-preferences').onclick=saveProject;
let importedName = 'imported_table';
function refreshExport() {
  const format=$('#format').value,image=['png','pdf','svg'].includes(format);
  $('#exchange-text').hidden=image;$('#text-label').hidden=image;$('#export-preview').hidden=!image;
  try {
    // Never label a stale diagram as an export of invalid editor text.
    parseSchema(source.value);
    if(image)compile();
    if(image)$('#export-preview').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(serializeDiagram(canvas).text);
    else $('#exchange-text').value=exportSchema(source.value,format);
    $('#format-help').textContent=image?'Full diagram, including tables outside the current viewport. Search dimming is excluded.':format==='dbml'?'Original DBML source, ready to save as a local file.':'SQL preserves the types you declared. Check that they are supported by the selected database (for example, PostgreSQL uuid is not a MySQL type).';
    $('#exchange-error').textContent='';$('#download').disabled=false;
  } catch(error){$('#exchange-error').textContent=errorText(error);$('#download').disabled=true;$('#export-preview').hidden=true;}
}
function formatHelp() {
  $('#format-help').textContent=$('#format').value==='csv'?'CSV headers become text columns. Data rows are not imported; types and relationships can be defined in DBML.':'Paste schema text or choose a local file, then review it before importing.';
}
function exchange(nextMode,format='dbml') {
  clearTimeout(debounce);compile();
  mode=nextMode;$('#exchange-title').textContent=mode==='import'?'Import schema':'Export schema';
  $('#format').replaceChildren(...(mode==='import'?importFormats:exportFormats).map(([id,label])=>{const option=document.createElement('option');option.value=id;option.textContent=label;return option;}));
  $('#format').value=format;
  $('#apply-import').hidden=mode!=='import';$('#download').hidden=mode!=='export';$('#file-import').hidden=mode!=='import';
  $('#exchange-text').readOnly=mode==='export';$('#exchange-error').textContent='';$('#schema-file').value='';
  $('#exchange-text').hidden=false;$('#text-label').hidden=false;$('#export-preview').hidden=true;
  if(mode==='export')refreshExport();else {$('#exchange-text').value='';formatHelp();}
  $('#schema-file').value='';
  $('#exchange').showModal();
}
function formatMenu(nextMode){
  const menu=$('#exchange-menu');menu.replaceChildren();
  for(const [format,label] of nextMode==='import'?importFormats:exportFormats){
    const button=document.createElement('button');button.type='button';button.role='menuitem';button.textContent=label;
    button.onclick=()=>{menu.hidePopover();if(nextMode==='import')exchange('import',format);else download(format);};menu.append(button);
  }
  menu.showPopover();
  const rect=$('#'+nextMode).getBoundingClientRect();menu.style.top=rect.height?rect.bottom+4+'px':'4px';menu.style.right='8px';
  menu.querySelector('button').focus();
}
$('#import').onclick=()=>formatMenu('import');$('#export').onclick=()=>formatMenu('export');
$('#format').onchange=()=>{if(mode==='export')refreshExport();else formatHelp();};
$('#schema-file').onchange=async()=>{
  const file=$('#schema-file').files[0];if(!file)return;
  try {
    if(file.size>10*1024*1024)throw Error('Keep schema imports under 10 MiB. Split the schema into smaller files.');
    const text=await file.text();
    importedName=file.name.replace(/\.[^.]+$/,'')||'imported_table';
    const ext=file.name.split('.').at(-1).toLowerCase();
    if(ext==='csv'||ext==='dbml')$('#format').value=ext;
    else if(ext==='rb')$('#format').value='schemarb';
    else if(ext==='sql'&&!['postgres','mysql','mssql','oracle','snowflake'].includes($('#format').value))$('#format').value='postgres';
    $('#exchange-text').value=text;$('#exchange-error').textContent='';formatHelp();
  }catch(error){$('#exchange-error').textContent='File could not be read: '+error.message;}
};
$('#apply-import').onclick=()=>{
  try {
    const text=importSchema($('#exchange-text').value,$('#format').value,importedName);
    if(dirty&&!confirm('Replace unsaved schema edits with this import?'))return;
    source.value=text;positions={};bends={};selectedRef=null;selected=null;$('#inspector').hidden=true;compile();markDirty();$('#exchange').close();
  }catch(error){$('#exchange-error').textContent='Import failed: '+errorText(error);}
};
async function download(format){
  const feedback=$('#file-status');feedback.hidden=false;feedback.textContent='Preparing export…';
  try {
    clearTimeout(debounce);parseSchema(source.value);compile();
    const image=['png','pdf','svg'].includes(format);
    const blob=image?await diagramFile(canvas,format):new Blob([exportSchema(source.value,format)],{type:'text/plain;charset=utf-8'});
    const filename=($('#project-name').value||'schema').replace(/[^a-z0-9_-]/gi,'-')+'.'+(image?format:format==='dbml'?'dbml':'sql');
    if(window.tool.saveExport){const result=await window.tool.saveExport({filename,bytes:new Uint8Array(await blob.arrayBuffer())});feedback.textContent=`Exported ${result.filename} to Downloads`;}
    else{downloadFile(blob,filename);feedback.textContent=`Download requested: ${filename}`;}
  }catch(error){feedback.textContent='Export failed: '+errorText(error);}
}
$('#download').onclick=()=>download($('#format').value);
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
(async()=>{
  try {
    const saved=await window.tool.request('load');
    source.value=saved?.source??sample;$('#project-name').value=saved?.name??'Platform starter';
    positions=saved?.positions??{};bends=saved?.bends??{};preferences={...preferences,...saved?.preferences};
    if(saved){$('#save-state').textContent=savedLabel;$('#recent-detail').textContent='DBML · Saved project';}
    compile();applyPreferences();
  } catch(error){source.disabled=true;$('#save').disabled=true;status.className='error';status.textContent='Project could not load. Reopen the preview before editing: '+error.message;}
})();
