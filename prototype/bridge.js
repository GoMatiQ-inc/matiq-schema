// Prototype-only desktop bridge. Implement sample state here; never call native APIs.
window.tool={request:async(name,value)=>{if(name==='load')return '';if(name==='save')return true;throw Error('Prototype command is not implemented: '+name);}};
