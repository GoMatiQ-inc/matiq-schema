import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const script=fs.readFileSync(new URL('../prototype/bridge.js',import.meta.url),'utf8');
function bridge(storage){const context={window:{},localStorage:storage};vm.runInNewContext(script,context);return context.window.tool;}
test('preview save reload preserves source, positions and preferences',async()=>{
 const entries=new Map();const storage={getItem:k=>entries.get(k),setItem:(k,v)=>entries.set(k,v)};
 const project={source:'Table users {\n id int [pk]\n}',positions:{'public.users':{x:40,y:45}},preferences:{types:false}};
 await bridge(storage).request('save',project);assert.deepEqual(JSON.parse(JSON.stringify(await bridge(storage).request('load'))),project);
});
test('preview storage read and write failures remain visible',async()=>{
 const tool=bridge({getItem:()=>{throw Error('Storage blocked');},setItem:()=>{throw Error('Quota exceeded');}});
 await assert.rejects(tool.request('load'),/Storage blocked/);await assert.rejects(tool.request('save',{}),/Quota exceeded/);
});
test('unknown preview operations fail rather than report success',async()=>{
 await assert.rejects(bridge({}).request('install'),/unavailable/);
});
