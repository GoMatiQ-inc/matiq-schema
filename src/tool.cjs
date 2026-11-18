const path=require('node:path');
const {projectStore,saveExport}=require('./project-store.cjs');
exports.activate=async host=>{
 const store=projectStore(host.dataDir);let exporting=0;
 host.handle('com.matiq.schema:request',async(name,args)=>{
  if(name==='load')return store.load();
  if(name==='save')return store.save(args);
  if(name==='export'){
   exporting++;
   try{return await saveExport(require('electron').app.getPath('downloads'),args);}finally{exporting--;}
  }
  throw Error('Unknown DBSchema command. Reopen the app and retry.');
 });
 await host.view.webContents.loadFile(path.join(host.resourceDir,'src/index.html'));
 return {
  status:async()=>{
   if(store.writing||exporting)return {busy:true,reason:'Wait for the current save or export to finish.'};
   const dirty=await host.view.webContents.executeJavaScript("document.body.dataset.dirty !== 'false'");
   return {busy:dirty,reason:dirty?'Save your DBSchema project before closing or applying updates.':''};
  },
  dispose:async()=>{if(store.writing||exporting)throw Error('Wait for the current save or export before closing DBSchema.');}
 };
};
