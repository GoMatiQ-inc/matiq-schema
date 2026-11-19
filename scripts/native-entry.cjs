const {app}=require('electron'),path=require('node:path');
const config=JSON.parse(require('node:fs').readFileSync(process.env.DBSCHEMA_TEST_CONFIG,'utf8'));
app.setPath('appData',path.join(config.profile,'appData'));
app.whenReady().then(()=>app.setPath('downloads',config.downloads));
const run=config.suite?require(path.join(config.suite,'app/main.cjs')).launch({...config,download:async url=>require('node:fs/promises').readFile(config.packages[url])}):require('@matiq-solutions/runtime/standalone.cjs').launch({root:path.join(__dirname,'..'),profile:config.profile});
run.then(instance=>{globalThis.schemaTest=instance;}).catch(error=>{console.error(error);app.exit(1);});
