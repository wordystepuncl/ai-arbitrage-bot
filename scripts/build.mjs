import {mkdir,writeFile,rm,copyFile} from 'node:fs/promises';
import {writePortableDemo} from './portable-demo.mjs';
const root=new URL('../',import.meta.url);
await rm(new URL('dist/',root),{recursive:true,force:true});
await mkdir(new URL('dist/client/',root),{recursive:true});
for(const name of ['index.html','styles.css','app.js','favicon.svg','config.js']){
 try{await copyFile(new URL('web/'+name,root),new URL('dist/client/'+name,root));}catch(e){if(name!=='config.js')throw e;}
}
for(const name of ['market.js','strategies.js']){
 try{await copyFile(new URL('src/'+name,root),new URL('dist/client/'+name,root));}catch(e){if(name!=='strategies.js')throw e;}
}
await writeFile(new URL('dist/client/.nojekyll',root),'');
await writePortableDemo(root);
console.log('Built DEMO.html and the GitHub Pages app in dist/client');
