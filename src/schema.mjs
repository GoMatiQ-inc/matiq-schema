import Papa from 'papaparse';
import { Parser, importer, exporter } from '@dbml/core';
export function parseSchema(source) {
  const db = Parser.parse(source, 'dbmlv2').export();
  return {
    tables: db.schemas.flatMap(s => s.tables.map(t => ({...t, schema: s.name, key: `${s.name}.${t.name}`}))),
    refs: db.schemas.flatMap(s => s.refs.map(r => ({...r, endpoints: r.endpoints.map(e => ({...e, key: `${e.schemaName || s.name}.${e.tableName}`}))}))),
  };
}
export const importFormats = [['dbml','DBML'],['postgres','PostgreSQL SQL'],['mysql','MySQL SQL'],['mssql','SQL Server SQL'],['oracle','Oracle SQL'],['snowflake','Snowflake SQL'],['schemarb','Rails schema.rb'],['csv','CSV headers → table']];
export const exportFormats = [['dbml','DBML'],['postgres','PostgreSQL SQL'],['mysql','MySQL SQL'],['mssql','SQL Server SQL'],['oracle','Oracle SQL'],['png','PNG image'],['pdf','PDF document'],['svg','SVG image']];
export function importSchema(text, format, tableName = 'imported_table') {
  if (!text.trim()) throw Error('Choose a file or paste a schema before importing.');
  if (!importFormats.some(([id]) => id === format)) throw Error('Choose a supported import format.');
  let dbml;
  if(format === 'csv') {
    const result = Papa.parse(text, {skipEmptyLines:'greedy',delimiter:','});
    if(result.errors.length)throw Error('Fix the CSV: '+result.errors[0].message);
    const headers=result.data[0]?.map(h=>h.trim());
    if(!headers?.length||headers.some(h=>!h)||new Set(headers).size!==headers.length)throw Error('Give every CSV column a non-empty, unique header.');
    if(result.data.some(row=>row.length!==headers.length))throw Error('Every CSV row must have the same number of fields as the header.');
    dbml='Table '+JSON.stringify(tableName)+' {\n'+headers.map(h=>'  '+JSON.stringify(h)+' text').join('\n')+'\n}';
  } else dbml = format === 'dbml' ? text : importer.import(text, format);
  const model=parseSchema(dbml);
  if(!model.tables.length)throw Error('The import has no tables. Choose the matching format and include table definitions.');
  return dbml;
}
export function exportSchema(text, format) {
  parseSchema(text);
  if(!exportFormats.some(([id])=>id===format)||['png','pdf','svg'].includes(format))throw Error('Choose a text schema format.');
  return format === 'dbml' ? text : exporter.export(text, format);
}
export function errorText(error) {
  return error.diags?.map(d => `${d.location?.start?.line ? `Line ${d.location.start.line}: ` : ''}${d.message}`).join(' · ') || error.message || String(error);
}
