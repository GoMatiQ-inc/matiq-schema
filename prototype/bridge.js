// Preview-only persistence. Native files, dialogs and lifecycle remain unimplemented.
window.tool = {request: async (name, value) => {
  if (name === 'load') return JSON.parse(localStorage.getItem('matiq-schema-draft') || 'null');
  if (name === 'save') { localStorage.setItem('matiq-schema-draft', JSON.stringify(value)); return true; }
  throw Error('Preview command is unavailable: ' + name);
}};
