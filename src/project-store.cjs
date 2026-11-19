const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const MAX=10*1024*1024;
function validateProject(value){
 if(!value||typeof value.source!=='string'||Buffer.byteLength(value.source)>MAX||typeof value.name!=='string'||value.name.length>200)throw Error('Use a project name under 200 characters and DBML under 10 MiB.');
 for(const [kind,entries] of [['positions',value.positions],['bends',value.bends||{}]]){
  if(!entries||typeof entries!=='object'||Array.isArray(entries)||Object.keys(entries).length>20000)throw Error('Project diagram data is invalid. Restore a saved project.');
  for(const point of Object.values(entries))if(!point||!(kind==='positions'?[point.x,point.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1000000):['x','y'].includes(point.axis)&&Number.isFinite(point.value)&&point.value>=0&&point.value<=1000000))throw Error('Project diagram coordinates are invalid. Restore a saved project.');
 }
 const p=value.preferences;
 if(!p||!['compact','comfortable'].includes(p.spacing)||typeof p.types!=='boolean'||typeof p.grid!=='boolean')throw Error('Project preferences are invalid. Restore a saved project.');
 const result={name:value.name,source:value.source,positions:value.positions,bends:value.bends||{},preferences:p};
 if(Buffer.byteLength(JSON.stringify(result))>MAX+4*1024*1024)throw Error('Reduce this project before saving; the project exceeds 14 MiB.');
 return result;
}
function projectStore(dataDir){
 const file=path.join(dataDir,'project.json');let writing=false;
 return {
  get writing(){return writing;},
  async load(){
   let raw;try{raw=await fs.readFile(file,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
   let record;try{record=JSON.parse(raw);}catch{throw Error('The saved project is damaged. Preserve project.json and restore your DBML backup before editing.');}
   if(record.schema!==1)throw Error('This project needs a newer DBSchema version. Update before opening it.');
   return validateProject(record.project);
  },
  async save(project){
   if(writing)throw Error('Wait for the current project save to finish.');
   const record=JSON.stringify({schema:1,project:validateProject(project)})+'\n',tmp=file+'.'+randomUUID()+'.tmp';
   writing=true;
   try{
    await fs.mkdir(dataDir,{recursive:true,mode:0o700});
    const handle=await fs.open(tmp,'wx',0o600);
    try{await handle.writeFile(record);await handle.sync();}finally{await handle.close();}
    await fs.rename(tmp,file);return true;
   }finally{writing=false;await fs.rm(tmp,{force:true});}
  }
 };
}
async function saveExport(directory,{filename,bytes}={}){
 if(typeof filename!=='string'||filename.length>220||!/^[a-z0-9_-]+\.(dbml|sql|svg|png|pdf)$/i.test(filename))throw Error('Choose a simple export filename and supported format.');
 if(!(bytes instanceof Uint8Array)||bytes.byteLength>40*1024*1024)throw Error('Keep exported files under 40 MiB.');
 const extension=path.extname(filename),base=filename.slice(0,-extension.length);
 await fs.mkdir(directory,{recursive:true});
 for(let i=0;i<10000;i++){
  const name=base+(i?' ('+i+')':'')+extension,file=path.join(directory,name);
  let handle;try{handle=await fs.open(file,'wx',0o600);}catch(error){if(error.code==='EEXIST')continue;throw error;}
  try{await handle.writeFile(bytes);await handle.sync();}catch(error){await handle.close();handle=null;await fs.rm(file);throw error;}finally{await handle?.close();}
  return {filename:name};
 }
 throw Error('Too many exports with this name. Rename the project and retry.');
}
module.exports={validateProject,projectStore,saveExport};
