import test from "node:test";
import assert from "node:assert/strict";
import {parseSchema,importSchema,exportSchema} from "../src/schema.mjs";
import {sample} from "../src/sample.mjs";
test("starter diagram contains six tables and seven resolved relationships",()=>{
 const model=parseSchema(sample);assert.equal(model.tables.length,6);assert.equal(model.refs.length,7);
 for(const ref of model.refs)for(const endpoint of ref.endpoints)assert.ok(model.tables.some(t=>t.key===endpoint.key));
});
test("quoted schema/table names and composite references retain identity",()=>{
 const model=parseSchema(`Table "sales"."order items" {\n order_id int\n item_id int\n indexes {\n (order_id, item_id) [pk]\n }\n}\nTable sales.lines {\n order_id int\n item_id int\n}\nRef: sales.lines.(order_id,item_id) > sales."order items".(order_id,item_id)`);
 assert.equal(model.tables[0].key,"sales.order items");assert.equal(model.refs[0].endpoints[0].fieldNames.length,2);
});
test("invalid DBML fails visibly",()=>assert.throws(()=>parseSchema("Table bad { id }")));
test("PostgreSQL export/import round trip retains tables and references",()=>{
 const sql=exportSchema(sample,"postgres");assert.match(sql,/CREATE TABLE/);
 const model=parseSchema(importSchema(sql,"postgres"));assert.equal(model.tables.length,6);assert.equal(model.refs.length,7);
});
test("DBML export preserves original source",()=>assert.equal(exportSchema(sample,"dbml"),sample));

for(const format of ['postgres','mysql','mssql','oracle'])test(format+' SQL export/import preserves compatible tables and relationships',()=>{
 const compatible='Table users {\n id int [pk]\n name varchar(100)\n}\nTable posts {\n id int [pk]\n user_id int [ref: > users.id]\n}';
 const sql=exportSchema(compatible,format);assert.match(sql,/CREATE TABLE/i);
 const model=parseSchema(importSchema(sql,format));assert.equal(model.tables.length,2);assert.equal(model.refs.length,1);
});
test('CSV preserves quoted headers as text columns without inventing relationships',()=>{
 const result=parseSchema(importSchema('id,"display,name"\n001,"Alice, B"','csv','people'));
 assert.equal(result.tables[0].name,'people');assert.equal(result.tables[0].fields[1].name,'display,name');assert.equal(result.refs.length,0);
});
test('invalid CSV, empty input and unknown formats fail visibly',()=>{
 assert.throws(()=>importSchema('id,id\n1,2','csv'),/unique/);assert.throws(()=>importSchema('id,name\n1','csv'),/same number/);
 assert.throws(()=>importSchema('','dbml'),/Choose a file/);assert.throws(()=>importSchema('Table a {}','bad'),/supported/);
 assert.throws(()=>exportSchema(sample,'bad'),/text schema format/);
});
test('explicit optional relationship survives parsing',()=>{
 const model=parseSchema(sample);assert.ok(model.refs.some(r=>r.endpoints.some(e=>e.relation==='0..1')));
});

test('SQL export preserves declared types rather than silently translating them',()=>assert.match(exportSchema(sample,'mysql'),/uuid/));
test('Snowflake and Rails source import produces DBML tables',()=>{
 assert.equal(parseSchema(importSchema('CREATE TABLE users (id INTEGER, name VARCHAR(100));','snowflake')).tables.length,1);
 assert.equal(parseSchema(importSchema('ActiveRecord::Schema.define(version: 1) do\n create_table "users", force: :cascade do |t|\n t.string "name"\n end\nend','schemarb')).tables.length,1);
});
