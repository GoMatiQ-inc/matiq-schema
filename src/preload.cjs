const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('tool',{request:(name,args)=>ipcRenderer.invoke('com.matiq.schema:request',name,args)});
