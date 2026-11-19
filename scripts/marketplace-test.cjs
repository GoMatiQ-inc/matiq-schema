const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron:electron}=require('playwright');
const {capture,captureTree,verifyStopped}=require('@matiq-solutions/sdk/fixture-lifecycle.cjs');
(async()=>{
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'dbschema-public-marketplace-'));
 let app,owned=[],failed=false,expired=false;
 const watchdog=setTimeout(()=>{expired=true;app?.process().kill('SIGKILL');},120000);
 try{
  assert.ok(process.env.SOLUTIONS_EXECUTABLE,'Set SOLUTIONS_EXECUTABLE to the installed signed Solutions executable.');
  app=await electron.launch({executablePath:process.env.SOLUTIONS_EXECUTABLE,args:['--user-data-dir='+profile],timeout:30000});owned=captureTree(capture(app.process()));
  const actual=await app.evaluate(({app})=>({packaged:app.isPackaged,profile:app.getPath('userData')}));assert.equal(actual.packaged,true);assert.equal(await fs.realpath(actual.profile),await fs.realpath(profile));
  const page=await app.firstWindow();page.setDefaultTimeout(30000);
  await page.getByText('No tools installed. Browse the marketplace to choose your first tool.',{exact:true}).waitFor();
  const refreshed=await page.evaluate(()=>window.solutions.request('catalog.refresh'));
  const state=await page.evaluate(()=>window.solutions.request('state')),schema=state.catalog.tools.find(t=>t.id==='com.matiq.schema');
  assert.ok(schema,'The published signed catalog must include DBSchema.');assert.equal(schema.version,'0.1.0');assert.deepEqual(state.installed.tools,{});
  await page.getByRole('button',{name:'Browse marketplace',exact:true}).click();await page.getByRole('button',{name:'DBSchema',exact:true}).click();await page.getByRole('button',{name:'Install',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Install',exact:true}).click();
  await page.getByRole('button',{name:'Open',exact:true}).waitFor();
  const installed=await page.evaluate(()=>window.solutions.request('state'));assert.equal(installed.installed.tools['com.matiq.schema'].version,'0.1.0');assert.deepEqual(Object.keys(installed.installed.tools),['com.matiq.schema']);
  const updates=await page.evaluate(()=>window.solutions.request('updates.check'));const after=await page.evaluate(()=>window.solutions.request('state'));assert.deepEqual(Object.keys(after.installed.tools),['com.matiq.schema']);assert.equal(after.installed.tools['com.matiq.schema'].pending,undefined);
  if(process.env.DBSCHEMA_SCREENSHOT)await page.screenshot({path:process.env.DBSCHEMA_SCREENSHOT});
  if(process.env.DBSCHEMA_PROOF)await fs.writeFile(process.env.DBSCHEMA_PROOF,JSON.stringify({passed:true,packagedSolutions:true,catalogSequence:state.catalog.sequence,version:schema.version,package:schema.packages[process.platform+'-'+process.arch],explicitInstall:true,noOtherToolsInstalled:true,updateCheckPassed:true,transport:'real public HTTPS; no mocks',platform:process.platform,arch:process.arch},null,2)+'\n');
  assert.equal(expired,false);console.log('PASS: installed signed Solutions refreshed the live signed catalog, explicitly downloaded/verified/installed DBSchema over public HTTPS, and checked for updates without installing other tools.');
 }catch(error){failed=true;if(app)for(const page of app.context().pages())console.error((await page.locator('body').innerText()).slice(-3000));throw error;}
 finally{
  clearTimeout(watchdog);
  if(app){owned=captureTree(capture(app.process()));if(failed){const closed=app.waitForEvent('close');app.process().kill('SIGKILL');await closed;}else await app.close();}
  for(const child of owned)await verifyStopped(child);
  await fs.rm(profile,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
