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
