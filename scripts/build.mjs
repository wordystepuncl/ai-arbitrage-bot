import {mkdir,readFile,writeFile,rm,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createSourceArchive} from './source-archive.mjs';
import {writePortableDemo} from './portable-demo.mjs';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const config=JSON.parse(await read('download-config.json'));
await rm(new URL('dist/',root),{recursive:true,force:true});
await mkdir(new URL('dist/client/downloads/',root),{recursive:true});
for(const name of ['index.html','styles.css','app.js','favicon.svg','config.js']){
 try{await copyFile(new URL('web/'+name,root),new URL('dist/client/'+name,root));}catch(e){if(name!=='config.js')throw e;}
}
for(const name of ['market.js','strategies.js']){
 try{await copyFile(new URL('src/'+name,root),new URL('dist/client/'+name,root));}catch(e){if(name!=='strategies.js')throw e;}
}
await writeFile(new URL('dist/client/.nojekyll',root),'');
const archive = await createSourceArchive(fileURLToPath(root), config.archiveName);
await writeFile(new URL('dist/client/downloads/'+config.archiveName,root),archive);
await writePortableDemo(root, config.archiveName, archive);
console.log('Built DEMO.html and the GitHub Pages app in dist/client');
