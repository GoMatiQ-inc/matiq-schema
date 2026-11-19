const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('tool',{native:true,request:(name,args)=>ipcRenderer.invoke('com.matiq.schema:request',name,args),saveExport:args=>ipcRenderer.invoke('com.matiq.schema:request','export',args)});
