import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root,stdio:'inherit'});
const args=process.argv.slice(2),port=Number(args.includes('--port')?args[args.indexOf('--port')+1]:process.env.PORT||3000),host=args.includes('--host')?args[args.indexOf('--host')+1]:'127.0.0.1';
const directory=resolve(root,'dist/client');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.zip':'application/zip'};
createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=resolve(directory,'.'+path);
  if(file!==directory&&!file.startsWith(directory+sep)){res.writeHead(403);res.end();return;}
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  const headers={'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(extname(file)==='.zip')headers['Content-Disposition']='attachment; filename="'+file.split(sep).at(-1)+'"';
  res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,host,()=>console.log(`Local Pages preview: http://${host}:${port}`));
