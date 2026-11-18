const path=require('node:path');
const {withMacKeychain}=require('@matiq-solutions/sdk/mac-keychain.cjs');
const {withNotaryProfile}=require('@matiq-solutions/sdk/notary-profile.cjs');
(async()=>{
 if(process.platform!=='darwin')throw Error('Build signed Mac releases on the authorized macOS runner.');
 if(!process.env.CSC_NAME?.startsWith('Developer ID Application:')||!process.env.APPLE_ID||!process.env.APPLE_TEAM_ID||!process.env.APPLE_APP_SPECIFIC_PASSWORD)throw Error('Provide the existing company signing and notarization credentials through the protected release environment.');
 await require('@matiq-solutions/sdk/prototype.cjs').approval(path.join(__dirname,'..'));
 const {build}=require('../package.json');
 const config={...build,forceCodeSigning:true,mac:{...build.mac,identity:process.env.CSC_NAME.slice('Developer ID Application:'.length).trim(),notarize:true}};
 await withMacKeychain(process.env,()=>withNotaryProfile(process.env,()=>require('electron-builder').build({projectDir:path.join(__dirname,'..'),config,publish:'never'})),{requireInstaller:false});
})().catch(error=>{console.error(error.message);process.exitCode=1;});
