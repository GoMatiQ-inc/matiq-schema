const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {_electron:electron}=require('playwright');
const {capture,captureTree,verifyStopped}=require('@matiq-solutions/sdk/fixture-lifecycle.cjs');
const {pack}=require('@matiq-solutions/sdk');
const root=path.join(__dirname,'..');
(async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'dbschema-native-'));let app,owned=[],expired=false,failed=false;
 const watchdog=setTimeout(()=>{expired=true;app?.process().kill('SIGTERM');},150000);
 const config={profile:path.join(temp,'standalone'),downloads:path.join(temp,'downloads')};
 await fs.mkdir(config.downloads,{recursive:true});await fs.mkdir(path.join(config.profile,'appData'),{recursive:true});
 const configPath=path.join(temp,'config.json'),source='Table users {\n id int [pk]\n}\nTable posts {\n uid int [ref: > users.id]\n}';
 async function launch(){await fs.writeFile(configPath,JSON.stringify(config));app=await electron.launch({executablePath:!config.suite&&process.env.DBSCHEMA_EXECUTABLE||require('electron'),args:!config.suite&&process.env.DBSCHEMA_EXECUTABLE?['--user-data-dir='+config.profile]:[path.join(__dirname,'native-entry.cjs')],env:{...process.env,DBSCHEMA_TEST_CONFIG:configPath},timeout:30000});owned=captureTree(capture(app.process()));const page=await app.firstWindow();page.on('console',message=>console.log('Renderer:',message.text()));page.on('pageerror',error=>console.error('Renderer error:',error.message));console.log('Renderer ready:',await page.evaluate(()=>({bridge:typeof window.tool,native:window.tool?.native,ready:document.readyState})));page.setDefaultTimeout(10000);if(!config.suite){await page.locator('#counts').filter({hasText:'tables'}).waitFor();if(process.env.DBSCHEMA_EXECUTABLE){const actual=await app.evaluate(({app},downloads)=>{app.setPath('downloads',downloads);return {packaged:app.isPackaged,profile:app.getPath('userData')};},config.downloads);assert.equal(actual.packaged,true);assert.equal(await fs.realpath(actual.profile),await fs.realpath(config.profile));}}return page;}
 async function close(force=false){if(!app)return;owned=captureTree(capture(app.process()));if(force){const exited=app.waitForEvent('close');app.process().kill('SIGKILL');await exited;}else await app.close();app=null;for(const child of owned)await verifyStopped(child);owned=[];}
 async function workflow(page,nav=page){
  for(const name of await fs.readdir(config.downloads))await fs.rm(path.join(config.downloads,name));
  await page.locator('#counts').filter({hasText:'tables'}).waitFor();await page.locator('#source').fill(source);await page.getByText('2 tables · 1 relationships',{exact:true}).waitFor();
  assert.equal(await page.locator('#source').getAttribute('aria-invalid'),'false');
  await page.getByRole('button',{name:'Table users, 1 columns',exact:true}).press('Enter');
  assert.match(await page.locator('#source').evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd)),/^Table users/);
  await page.locator('#close-inspector').click();
  const header=page.locator('.table-head').first(),box=await header.boundingBox(),before=await page.locator('.relation').getAttribute('d');
  await page.mouse.move(box.x+30,box.y+15);await page.mouse.down();await page.mouse.move(box.x+40,box.y+65);
  assert.notEqual(await page.locator('.relation').getAttribute('d'),before,'Connectors must move before pointerup');await page.mouse.up();
  await page.getByRole('button',{name:'Relationship users.id to posts.uid',exact:true}).press('Enter');
  assert.equal(await page.locator('#source').evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd)),'ref: > users.id');
  const bend=page.locator('.route-handle'),bendBox=await bend.boundingBox(),old=await page.locator('.relation').getAttribute('d');
  await page.mouse.move(bendBox.x+6,bendBox.y+6);await page.mouse.down();await page.mouse.move(bendBox.x+40,bendBox.y+30);await page.mouse.up();
  assert.notEqual(await page.locator('.relation').getAttribute('d'),old,'Line handle must change route');
  await page.locator('#source').fill('Table broken {\n id\n}');await page.locator('#problems').waitFor({state:'visible'});assert.match(await page.locator('#problems').innerText(),/column must have a type/);
  await page.locator('#problem-list button').click();assert.equal(await page.locator('#source').evaluate(el=>el.value.slice(el.selectionStart,el.selectionEnd)),'id');
  await page.locator('#source').fill(source);await page.locator('#problems').waitFor({state:'hidden'});
  await nav.getByRole('button',{name:'Import',exact:true}).click();await page.getByRole('menuitem',{name:'DBML',exact:true}).click();
  const file=path.join(temp,'fixture.dbml');await fs.writeFile(file,source);await page.locator('#schema-file').setInputFiles(file);await page.waitForFunction(text=>document.querySelector('#exchange-text').value===text,source);assert.equal(await page.locator('#exchange-text').inputValue(),source);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#apply-import').click();await page.locator('#exchange').waitFor({state:'hidden'});
  await page.locator('#project-name').fill('Native-qualification');
  for(const label of ['DBML','SVG image','PNG image','PDF document']){
   await nav.getByRole('button',{name:'Export',exact:true}).click();await page.getByRole('menuitem',{name:label,exact:true}).click();await page.locator('#file-status').filter({hasText:'Exported'}).waitFor();
  }
  assert.equal(await fs.readFile(path.join(config.downloads,'Native-qualification.dbml'),'utf8'),source);
  assert.match(await fs.readFile(path.join(config.downloads,'Native-qualification.svg'),'utf8'),/<svg/);
  const png=await fs.readFile(path.join(config.downloads,'Native-qualification.png'));assert.equal(png.subarray(1,4).toString(),'PNG');assert.match((await fs.readFile(path.join(config.downloads,'Native-qualification.pdf'))).subarray(0,8).toString(),/%PDF/);
  assert.equal(await page.locator('#exchange').isVisible(),false,'Export must not open an extra dialog');
  await assert.rejects(page.evaluate(()=>window.tool.request('export',{filename:'../escape.dbml',bytes:new Uint8Array([1])})),/filename/);
  await nav.getByRole('button',{name:'Save project',exact:true}).click();await page.locator('#save-state').filter({hasText:'Saved on this device'}).waitFor();
 }
 try{
  let page=await launch();await workflow(page);await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#show-grid').uncheck();await page.locator('#save-preferences').click();await page.getByRole('button',{name:'Diagram',exact:true}).click();await close();
  page=await launch();await page.locator('#source').waitFor();assert.equal(await page.locator('#source').inputValue(),source);assert.equal(await page.locator('#project-name').inputValue(),'Native-qualification');assert.equal(await page.locator('#show-grid').isChecked(),false);await close();
  console.log('PASS: standalone real renderer, live dragging, line dragging, source jumps, diagnostics, file import, Downloads exports, save and restart settings.');
  if(process.env.DBSCHEMA_SUITE){
   const manifest=JSON.parse(await fs.readFile(path.join(root,'matiq-tool.json'),'utf8')),keys=crypto.generateKeyPairSync('ed25519'),file=path.join(temp,'tool.mqt');
   let meta,publishers={fixture:keys.publicKey.export({type:'spki',format:'pem'})},entry=manifest;
   if(process.env.DBSCHEMA_PACKAGE){const release=JSON.parse(await fs.readFile(process.env.DBSCHEMA_PACKAGE+'.release.json','utf8'));publishers=require(path.join(process.env.DBSCHEMA_SUITE,'catalog/trust.json')).publishers;assert.ok(require('@matiq-solutions/sdk').verify(release.signed,release.signature,publishers[release.publisher]));entry=release.signed;meta=entry.packages[process.platform+'-'+process.arch];await fs.copyFile(process.env.DBSCHEMA_PACKAGE,file);}else meta=await pack({root,manifest,publisher:'fixture',privateKey:keys.privateKey,include:['src','node_modules/@matiq-solutions/shell'],output:file});
   const url=meta.url||'https://fixture.invalid/schema';
   config.suite=process.env.DBSCHEMA_SUITE;config.profile=path.join(temp,'suite');await fs.mkdir(path.join(config.profile,'appData'),{recursive:true});config.publishers=publishers;config.catalog={schema:1,sequence:1,tools:[{...entry,packages:{[process.platform+'-'+process.arch]:{url,...meta}}}]};config.packages={[url]:file,'https://fixture.invalid/schema-next':path.join(temp,'next.mqt')};
   page=await launch();await page.getByText('No tools installed. Browse the marketplace to choose your first tool.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Browse marketplace',exact:true}).click();await page.getByRole('button',{name:'DBSchema',exact:true}).click();await page.getByRole('button',{name:'Install',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Install',exact:true}).click();await page.getByRole('button',{name:'Open',exact:true}).click();
   let tool;for(let i=0;i<100;i++){tool=app.context().pages().find(p=>p.url().endsWith('/src/index.html'));if(tool)break;await new Promise(r=>setTimeout(r,50));}assert.ok(tool);
   await workflow(tool,page.getByRole('navigation',{name:'DBSchema navigation'}));
   await page.getByRole('button',{name:'DBSchema settings',exact:true}).click();await tool.locator('#page-settings').waitFor({state:'visible'});await tool.locator('#show-types').uncheck();await tool.locator('#save-preferences').click();await close();
   page=await launch();await page.getByRole('button',{name:'Open app launcher',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'DBSchema',exact:true}).click();
   for(let i=0;i<100;i++){tool=app.context().pages().find(p=>p.url().endsWith('/src/index.html'));if(tool)break;await new Promise(r=>setTimeout(r,50));}await tool.locator('#counts').filter({hasText:'tables'}).waitFor();assert.equal(await tool.locator('#source').inputValue(),source);assert.equal(await tool.locator('#show-types').isChecked(),false);
   if(!process.env.DBSCHEMA_PACKAGE){
    const newer={...manifest,version:'0.1.1'},nextFile=path.join(temp,'next.mqt'),nextMeta=await pack({root,manifest:newer,publisher:'fixture',privateKey:keys.privateKey,include:['src','node_modules/@matiq-solutions/shell'],output:nextFile});
    const nextEntry={...newer,packages:{[process.platform+'-'+process.arch]:{url:'https://fixture.invalid/schema-next',...nextMeta}}};
    const current=await page.evaluate(()=>window.solutions.request('state'));
    const signed={schema:1,sequence:current.catalog.sequence+1,expires:new Date(Date.now()+86400000).toISOString(),tools:[nextEntry]},envelope={signed,publisher:'fixture',signature:require('@matiq-solutions/sdk').sign(signed,keys.privateKey)};
    await app.evaluate((_,envelope)=>{globalThis.fetch=async()=>new Response(JSON.stringify(envelope),{status:200});},envelope);
    await page.evaluate(()=>window.solutions.request('catalog.refresh'));
    await page.evaluate(()=>window.solutions.request('install',{id:'com.matiq.schema',update:true}));
    const staged=await page.evaluate(()=>window.solutions.request('state'));assert.equal(staged.installed.tools['com.matiq.schema'].version,'0.1.0');assert.equal(staged.installed.tools['com.matiq.schema'].pending.version,'0.1.1');
    const edited=source+'\n// Retain edits during an installed-tool update';await tool.locator('#source').fill(edited);
    await assert.rejects(page.evaluate(()=>window.solutions.request('restart')),/Save your DBSchema project/);
    assert.equal(await tool.locator('#source').inputValue(),edited);await page.getByRole('navigation',{name:'DBSchema navigation'}).getByRole('button',{name:'Save project',exact:true}).click();await tool.locator('#save-state').filter({hasText:'Saved on this device'}).waitFor();
    config.catalog.tools=[nextEntry];await close();page=await launch();const activated=await page.evaluate(()=>window.solutions.request('state'));assert.equal(activated.installed.tools['com.matiq.schema'].version,'0.1.1');assert.equal(activated.installed.tools['com.matiq.schema'].pending,undefined);
    await page.getByRole('button',{name:'Open app launcher',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'DBSchema',exact:true}).click();
    for(let i=0;i<100;i++){tool=app.context().pages().find(p=>p.url().endsWith('/src/index.html'));if(tool)break;await new Promise(r=>setTimeout(r,50));}await tool.locator('#counts').filter({hasText:'tables'}).waitFor();assert.equal(await tool.locator('#source').inputValue(),edited);assert.equal(await tool.locator('#show-types').isChecked(),false);
    console.log('PASS: SDK stages a newer DBSchema fixture version, blocks restart over unsaved work, activates after a saved restart, and retains source/settings. Synthetic versions use the real tool implementation.');
   }
   await close();
   console.log(process.env.DBSCHEMA_PACKAGE?'PASS: exact release-signed package installed and reopened through the native Solutions host; native workflow/settings/persistence pass. Package transport is a local test fixture.':'PASS: actual signed development package installation, hosted renderer and unified settings, native local files, restart persistence. Fixture signing only; not release qualification.');
  }
  assert.equal(expired,false);if(process.env.DBSCHEMA_PROOF)await fs.writeFile(process.env.DBSCHEMA_PROOF,JSON.stringify({schema:1,platform:process.platform,arch:process.arch,packagedStandalone:!!process.env.DBSCHEMA_EXECUTABLE,releasePackage:!!process.env.DBSCHEMA_PACKAGE,passed:true,checks:['live-table-connectors','draggable-line','source-navigation','dbml-diagnostics','file-import','downloads-dbml-svg-png-pdf','safe-export-denial','atomic-save','unified-settings','restart-persistence']},null,2)+'\n');
 }catch(error){failed=true;if(app)for(const page of app.context().pages())console.error('Native diagnostic:',page.url(),(await page.locator('body').innerText()).slice(-4000));throw error;}finally{clearTimeout(watchdog);await close(failed);await fs.rm(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
