import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {projectStore,saveExport}=createRequire(import.meta.url)('../src/project-store.cjs');
const project={name:'Test',source:'Table a {\n id int\n}',positions:{'public.a':{x:5,y:10}},bends:{ref:{axis:'x',value:30}},preferences:{spacing:'compact',types:true,grid:false}};
test('atomic save and reload retain editor, layout, routes and settings',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dbschema-store-'));
 try{const store=projectStore(root);assert.equal(await store.load(),null);await store.save(project);assert.deepEqual(await projectStore(root).load(),project);assert.deepEqual(await fs.readdir(root),['project.json']);await assert.rejects(store.save({...project,positions:{bad:{x:NaN,y:5}}}),/coordinates/);assert.deepEqual(await store.load(),project);await fs.writeFile(path.join(root,'project.json'),'broken');await assert.rejects(store.load(),/damaged/);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('downloads never overwrite or accept a caller-selected path',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dbschema-export-'));
 try{const args={filename:'schema.dbml',bytes:new Uint8Array([65,66])};assert.equal((await saveExport(root,args)).filename,'schema.dbml');assert.equal((await saveExport(root,args)).filename,'schema (1).dbml');assert.equal(await fs.readFile(path.join(root,'schema.dbml'),'utf8'),'AB');await assert.rejects(saveExport(root,{...args,filename:'../escape.dbml'}),/filename/);await assert.rejects(saveExport(root,{...args,bytes:'bad'}),/40 MiB/);}finally{await fs.rm(root,{recursive:true,force:true});}
});
