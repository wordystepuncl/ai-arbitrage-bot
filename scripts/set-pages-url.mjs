import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function resolvePagesUrl({baseUrl,repository}={}){
 let value=baseUrl;
 if(!value&&repository){
  const [owner,repo,...rest]=repository.split('/');
  if(!owner||!repo||rest.length)throw Error('Repository must be owner/name');
  value=`https://${owner}.github.io/`+(repo.toLowerCase()===`${owner}.github.io`.toLowerCase()?'':encodeURIComponent(repo)+'/');
 }
 if(!value)return null;
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Pages URL must be an HTTPS base URL without credentials, query or fragment');
 if(!url.pathname.endsWith('/'))url.pathname+='/';
 return url.href;
}
export async function preparePages(root,{baseUrl,repository}={}){
 const url=resolvePagesUrl({baseUrl,repository});
 if(!url)return null;
 const config=JSON.parse(await readFile(resolve(root,'download-config.json'),'utf8'));
 const readmePath=resolve(root,'README.md');let text=await readFile(readmePath,'utf8');
 const block=`<!-- pages-links:start -->\n[![VIEW DEMO](docs/view-demo.svg)](${url})\n[![DOWNLOAD](docs/download-project.svg)](${config.downloadUrl})\n\n[Live demo](${url}) · [GitHub Pages setup](docs/GITHUB_PAGES.md)\n<!-- pages-links:end -->`;
 if(!text.includes('<!-- pages-links:start -->'))throw Error('README Pages links marker is missing');
 text=text.replace(/<!-- pages-links:start -->[\s\S]*?<!-- pages-links:end -->/,()=>block);
 await writeFile(readmePath,text);
 return url;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),index=args.indexOf('--url');
 if(index>=0&&!args[index+1])throw Error('--url requires a value');
 const url=await preparePages(fileURLToPath(new URL('../',import.meta.url)),{baseUrl:index>=0?args[index+1]:process.env.PAGES_BASE_URL,repository:process.env.GITHUB_REPOSITORY});
 console.log(url?'README demo links configured for '+url:'Pages links will be configured on the first deployment.');
}
