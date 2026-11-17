import test from 'node:test';
import assert from 'node:assert/strict';
import {connection,routeOrthogonal,cardinality,fieldY,tableHeight,TABLE_WIDTH} from '../src/diagram.mjs';
const table=(key,names)=>({key,fields:names.map(name=>({name}))});
test('right-angle routing avoids an intervening table',()=>{
 const obstacle={x:80,y:0,width:80,height:100};
 const points=routeOrthogonal({x:20,y:40},{x:220,y:60},[obstacle]);
 for(let i=1;i<points.length;i++) {
  const a=points[i-1],b=points[i];assert.ok(a.x===b.x||a.y===b.y);
  if(a.x===b.x)assert.ok(a.x<=obstacle.x||a.x>=obstacle.x+obstacle.width||Math.min(a.y,b.y)>=100||Math.max(a.y,b.y)<=0);
  else assert.ok(a.y<=0||a.y>=100||Math.min(a.x,b.x)>=160||Math.max(a.x,b.x)<=80);
 }
});
test('endpoints attach to exact field cells and use rigid path commands',()=>{
 const tables=[table('a',['id','name']),table('b',['id','a_id'])],positions={a:{x:40,y:40},b:{x:450,y:200}};
 const result=connection({key:'a',fieldNames:['id']},{key:'b',fieldNames:['a_id']},tables,positions);
 assert.equal(result.first.x,40+TABLE_WIDTH);assert.equal(result.first.y,40+fieldY(tables[0],'id'));
 assert.equal(result.last.x,450);assert.equal(result.last.y,200+fieldY(tables[1],'a_id'));
 assert.doesNotMatch(result.path,/[CQ]/);assert.equal(tableHeight(tables[0]),86);
});
test('one-to-one, one-to-many, many-to-many and optional ends remain distinct',()=>{
 assert.deepEqual(cardinality('1'),{many:false,optional:false,label:'exactly one'});
 assert.equal(cardinality('*').many,true);assert.equal(cardinality('0..1').optional,true);
 assert.deepEqual(cardinality('0..*'),{many:true,optional:true,label:'zero or many'});
 assert.throws(()=>cardinality('unknown'),/Unsupported/);
});
test('self-reference routes outside its own table',()=>{
 const t=table('a',['id','parent_id']),p={a:{x:40,y:40}};
 const result=connection({key:'a',fieldNames:['id']},{key:'a',fieldNames:['parent_id']},[t],p);
 assert.equal(result.first.direction,1);assert.equal(result.last.direction,1);assert.doesNotMatch(result.path,/NaN|undefined/);
});

test('shared-field attachment offsets remain inside the same row',()=>{
 const tables=[table('a',['id']),table('b',['id'])],positions={a:{x:40,y:40},b:{x:450,y:40}};
 const one=connection({key:'a',fieldNames:['id']},{key:'b',fieldNames:['id']},tables,positions,-8,8);
 const two=connection({key:'a',fieldNames:['id']},{key:'b',fieldNames:['id']},tables,positions,8,-8);
 assert.equal(two.first.y-one.first.y,16);assert.ok(one.first.y>74&&two.first.y<100);
});
