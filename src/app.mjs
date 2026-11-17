import { parseSchema, importSchema, exportSchema, errorText } from './schema.mjs';
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
    row.forEach((t,j) => positions[t.key] = {x:40+j*(250+gap),y});
    y += Math.max(...row.map(t=>46+t.fields.length*26)) + gap;
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
    if (!positions[t.key]) positions[t.key] = {x:40+(model.tables.indexOf(t)%3)*345,y:50+Math.floor(model.tables.indexOf(t)/3)*300};
    width=Math.max(width,positions[t.key].x+300); height=Math.max(height,positions[t.key].y+90+t.fields.length*26);
  }
  canvas.setAttribute('viewBox',`0 0 ${width} ${height}`);
  canvas.setAttribute('width',Math.round(width*zoom));canvas.setAttribute('height',Math.round(height*zoom));
  $('#zoom-label').value = `${Math.round(zoom*100)}%`;
  for (const r of model.refs) {
    const [a,b] = r.endpoints, pa=positions[a.key], pb=positions[b.key];
    if (!pa || !pb) continue;
    const ta=model.tables.find(t=>t.key===a.key),tb=model.tables.find(t=>t.key===b.key);
    const ax=pa.x+250,ay=pa.y+48+Math.max(0,ta.fields.findIndex(f=>f.name===a.fieldNames[0]))*26;
    const bx=pb.x,by=pb.y+48+Math.max(0,tb.fields.findIndex(f=>f.name===b.fieldNames[0]))*26;
    const mid=(ax+bx)/2;
    const path=svg('path',{d:`M ${ax} ${ay} C ${mid} ${ay}, ${mid} ${by}, ${bx} ${by}`,class:'relation'});
    svg('title',{},`${a.tableName}.${a.fieldNames.join(', ')} (${a.relation}) → ${b.tableName}.${b.fieldNames.join(', ')} (${b.relation})`,path);
    svg('text',{x:ax+6,y:ay-5,class:'relation-label'},a.relation);
    svg('text',{x:bx-12,y:by-5,class:'relation-label'},b.relation);
  }
  for (const t of model.tables) {
    const p=positions[t.key], h=40+t.fields.length*26;
    const g=svg('g',{transform:`translate(${p.x},${p.y})`,class:`table-card${selected===t.key?' selected':''}${q&&!t.key.toLowerCase().includes(q)?' dimmed':''}`,tabindex:0,role:'button','aria-label':`Table ${t.name}, ${t.fields.length} columns`});
    svg('rect',{width:250,height:h,rx:6,class:'table-body'},undefined,g);
    const head=svg('rect',{width:250,height:34,rx:6,class:'table-head'},undefined,g);
    svg('text',{x:12,y:22,class:'table-name'},t.schema==='public'?t.name:t.key,g);
    t.fields.forEach((f,i)=>{
      const y=53+i*26;
      svg('text',{x:10,y,class:'table-key'},f.pk?'◆':'',g);
      svg('text',{x:28,y,class:'column-name'},f.name.length>23?f.name.slice(0,22)+'…':f.name,g);
      if(preferences.types) svg('text',{x:240,y,'text-anchor':'end',class:'column-type'},f.type.type_name,g);
    });
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
  const max=Math.max(800,...model.tables.map(t=>positions[t.key].x+300));
  setZoom($('#diagram-scroll').clientWidth/max);
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
function refreshExport() {
  try {$('#exchange-text').value=exportSchema(source.value,$('#format').value);$('#exchange-error').textContent='';$('#download').disabled=false;}
  catch(error){$('#exchange-error').textContent=errorText(error);$('#download').disabled=true;}
}
function exchange(nextMode) {
  mode=nextMode;$('#exchange-title').textContent=mode==='import'?'Import schema':'Export schema';
  $('#apply-import').hidden=mode!=='import';$('#download').hidden=mode!=='export';
  $('#exchange-text').readOnly=mode==='export';$('#exchange-error').textContent='';
  if(mode==='export')refreshExport();else $('#exchange-text').value='';
  $('#exchange').showModal();
}
$('#import').onclick=()=>exchange('import');$('#export').onclick=()=>exchange('export');
$('#format').onchange=()=>{if(mode==='export')refreshExport();};
$('#apply-import').onclick=()=>{
  try {
    const text=importSchema($('#exchange-text').value,$('#format').value);
    if(dirty&&!confirm('Replace unsaved schema edits with this import?'))return;
    source.value=text;positions={};selected=null;$('#inspector').hidden=true;compile();markDirty();$('#exchange').close();
  }catch(error){$('#exchange-error').textContent='Import failed: '+errorText(error);}
};
$('#download').onclick=()=>{
  const blob=new Blob([$('#exchange-text').value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=($('#project-name').value||'schema').replace(/[^a-z0-9_-]/gi,'-')+($('#format').value==='dbml'?'.dbml':'.sql');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
