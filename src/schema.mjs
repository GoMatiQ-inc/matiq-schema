import { Parser, importer, exporter } from '@dbml/core';
export function parseSchema(source) {
  const db = Parser.parse(source, 'dbmlv2').export();
  return {
    tables: db.schemas.flatMap(s => s.tables.map(t => ({...t, schema: s.name, key: `${s.name}.${t.name}`}))),
    refs: db.schemas.flatMap(s => s.refs.map(r => ({...r, endpoints: r.endpoints.map(e => ({...e, key: `${e.schemaName || s.name}.${e.tableName}`}))}))),
  };
}
export function importSchema(text, format) {
  const dbml = format === 'dbml' ? text : importer.import(text, 'postgres');
  parseSchema(dbml);
  return dbml;
}
export function exportSchema(text, format) {
  parseSchema(text);
  return format === 'dbml' ? text : exporter.export(text, 'postgres');
}
export function errorText(error) {
  return error.diags?.map(d => `${d.location?.start?.line ? `Line ${d.location.start.line}: ` : ''}${d.message}`).join(' · ') || error.message || String(error);
}
