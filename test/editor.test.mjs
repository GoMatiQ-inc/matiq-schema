import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSchema,diagnostics} from '../src/schema.mjs';
import {connection} from '../src/diagram.mjs';
test('source ranges reveal quoted tables and inline or standalone relationships',()=>{
 const source='Table "user list" {\n id int [pk]\n}\nTable posts {\n uid int [ref: > "user list".id]\n other int\n}\nRef: posts.other > "user list".id';
 const model=parseSchema(source);
 for(const t of model.tables)assert.match(source.slice(t.sourceRange.start.offset,t.sourceRange.end.offset),/^Table /);
 for(const r of model.refs)assert.match(source.slice(r.sourceRange.start.offset,r.sourceRange.end.offset),/ref:|Ref:/);
});
test('diagnostics preserve all errors and exact offending source',()=>{
 const source='Table users {\n id int [wat]\n missing\n}';
 try{parseSchema(source);assert.fail('Expected diagnostics');}catch(error){const issues=diagnostics(error,source);assert.equal(issues.length,2);assert.equal(source.slice(issues[0].start,issues[0].end),'wat');assert.equal(issues[1].line,3);}
});
test('manual bend stays rigid while attached tables move',()=>{
 const model=parseSchema('Table a {\n id int [pk]\n}\nTable b {\n aid int [ref: > a.id]\n}');
 const positions={'public.a':{x:40,y:40},'public.b':{x:500,y:200}},[a,b]=model.refs[0].endpoints;
 const route=connection(a,b,model.tables,positions,0,0,{axis:'x',value:420});
 positions['public.a'].y+=60;const moved=connection(a,b,model.tables,positions,0,0,{axis:'x',value:420});
 assert.notEqual(moved.path,route.path);assert.equal(moved.first.y,route.first.y+60);
 moved.points.slice(1).forEach((p,i)=>assert.ok(p.x===moved.points[i].x||p.y===moved.points[i].y));
 assert.ok(moved.points.some(p=>p.x===420));
});
