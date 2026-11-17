import { parseSchema, importSchema, exportSchema, errorText, importFormats, exportFormats } from './schema.mjs';
import { TABLE_WIDTH, HEADER_HEIGHT, ROW_HEIGHT, tableHeight, cardinality, connection } from './diagram.mjs';
import { serializeDiagram, diagramFile, downloadFile } from './export.mjs';
import { sample } from './sample.mjs';
const $ = selector => document.querySelector(selector);
const source = $('#source'), canvas = $('#diagram'), status = $('#parse-status');
let model, positions = {}, selected = null, zoom = 1, dirty = false, mode = 'import';
let preferences = {spacing:'comfortable', types:true, grid:true};
const SVG = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, text, parent = canvas) {
  const el = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  parent.append(el); return el;
}
function markDirty() { dirty = true; $('#save-state').textContent = 'Unsaved changes'; $('#settings-state').textContent = 'Unsaved changes'; }
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
function inspect(key) {
  selected = key; const t = model.tables.find(t=>t.key===key);
  $('#inspector').hidden = !t;
  if (t) {
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
    const route=connection(a,b,model.tables,positions,portOffsets.get(a).offset,portOffsets.get(b).offset);
    route.first.half=portOffsets.get(a).half;route.last.half=portOffsets.get(b).half;
    const path=svg('path',{d:route.path,class:'relation'});
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
    head.onpointerdown=e=>{
      e.preventDefault();head.setPointerCapture(e.pointerId);
      const start={x:e.clientX,y:e.clientY,...p},rect=canvas.getBoundingClientRect();
      head.onpointermove=move=>{
        p.x=Math.max(5,start.x+(move.clientX-e.clientX)*width/rect.width);
        p.y=Math.max(5,start.y+(move.clientY-e.clientY)*height/rect.height);
        g.setAttribute('transform',`translate(${p.x},${p.y})`);
      };
      head.onpointerup=()=>{head.onpointermove=null;markDirty();render();};
    };
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
  $('#line-numbers').textContent=source.value.split('\n').map((_,i)=>i+1).join('\n');
  try {
    const next=parseSchema(source.value); model=next;
    if (!Object.keys(positions).length) layout();
    render();$('#counts').textContent=`${model.tables.length} tables · ${model.refs.length} relationships`;
    status.className='';status.textContent='Schema valid · Changes are processed on this device.';
  } catch(error) {
    status.className='error';status.textContent='Fix the DBML to update the diagram: '+errorText(error)+'. Showing the last valid diagram.';
  }
}
let debounce;
source.oninput=()=>{markDirty();clearTimeout(debounce);debounce=setTimeout(compile,250);};
source.onscroll=()=>$('#line-numbers').scrollTop=source.scrollTop;
$('#project-name').oninput=markDirty;
$('#search').oninput=render;
$('#arrange').onclick=()=>{layout();render();markDirty();};
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
  $('#project-name').value='Untitled schema';positions={};selected=null;$('#inspector').hidden=true;compile();markDirty();navigate('diagram');
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
  try {await window.tool.request('save',{name:$('#project-name').value,source:source.value,positions,preferences});dirty=false;$('#save-state').textContent='Saved in this browser';$('#recent-detail').textContent='DBML · Saved preview project';$('#settings-state').textContent='Saved in this browser';}
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
function exchange(nextMode) {
  clearTimeout(debounce);compile();
  mode=nextMode;$('#exchange-title').textContent=mode==='import'?'Import schema':'Export schema';
  $('#format').replaceChildren(...(mode==='import'?importFormats:exportFormats).map(([id,label])=>{const option=document.createElement('option');option.value=id;option.textContent=label;return option;}));
  $('#apply-import').hidden=mode!=='import';$('#download').hidden=mode!=='export';$('#file-import').hidden=mode!=='import';
  $('#exchange-text').readOnly=mode==='export';$('#exchange-error').textContent='';$('#schema-file').value='';
  $('#exchange-text').hidden=false;$('#text-label').hidden=false;$('#export-preview').hidden=true;
  if(mode==='export')refreshExport();else {$('#exchange-text').value='';formatHelp();}
  $('#schema-file').value='';
  $('#exchange').showModal();
}
$('#import').onclick=()=>exchange('import');$('#export').onclick=()=>exchange('export');
$('#format').onchange=()=>{if(mode==='export')refreshExport();else formatHelp();};
$('#schema-file').onchange=async()=>{
  const file=$('#schema-file').files[0];if(!file)return;
  try {
    if(file.size>10*1024*1024)throw Error('Choose a schema file smaller than 10 MiB.');
    $('#exchange-text').value=await file.text();importedName=file.name.replace(/\.[^.]+$/,'')||'imported_table';
    const extension=file.name.split('.').at(-1).toLowerCase();
    if(['dbml','csv'].includes(extension))$('#format').value=extension;
    if(extension==='rb')$('#format').value='schemarb';
    $('#exchange-error').textContent='';formatHelp();
  }catch(error){$('#exchange-error').textContent='File could not be read: '+error.message;}
};
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
    source.value=text;positions={};selected=null;$('#inspector').hidden=true;compile();markDirty();$('#exchange').close();
  }catch(error){$('#exchange-error').textContent='Import failed: '+errorText(error);}
};
$('#download').onclick=async()=>{
  const format=$('#format').value;$('#download').disabled=true;
  try {
    const image=['png','pdf','svg'].includes(format);
    const blob=image?await diagramFile(canvas,format):new Blob([exportSchema(source.value,format)],{type:'text/plain;charset=utf-8'});
    const filename=($('#project-name').value||'schema').replace(/[^a-z0-9_-]/gi,'-');
    downloadFile(blob,filename+'.'+(image?format:format==='dbml'?'dbml':'sql'));
    $('#exchange-error').textContent='';
  }catch(error){$('#exchange-error').textContent='Export failed: '+error.message;}
  finally{$('#download').disabled=false;}
};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
(async()=>{
  try {
    const saved=await window.tool.request('load');
    source.value=saved?.source??sample;$('#project-name').value=saved?.name??'Platform starter';
    positions=saved?.positions??{};preferences={...preferences,...saved?.preferences};
    if(saved){$('#save-state').textContent='Saved in this browser';$('#recent-detail').textContent='DBML · Saved preview project';}
    compile();applyPreferences();
  } catch(error){source.disabled=true;$('#save').disabled=true;status.className='error';status.textContent='Project could not load. Reopen the preview before editing: '+error.message;}
})();
