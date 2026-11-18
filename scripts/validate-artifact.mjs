import {Script} from 'node:vm';
import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=resolve(root,'dist/client');
const html=await readFile(resolve(dist,'index.html'),'utf8');
for(const name of ['index.html','app.js','styles.css','market.js','favicon.svg'])assert.ok((await stat(resolve(dist,name))).isFile());
for(const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g))assert.ok((await stat(resolve(dist,match[1]))).isFile(),match[1]);
assert.equal(await readFile(resolve(dist,'app.js'),'utf8'),await readFile(resolve(root,'web/app.js'),'utf8'));
const app=await readFile(resolve(dist,'app.js'),'utf8');assert.ok(!app.includes('./api/'),'Static app must call public market APIs directly');
const config=JSON.parse(await readFile(resolve(root,'download-config.json'),'utf8'));
const portable = await readFile(resolve(root, 'DEMO.html'), 'utf8');
assert.doesNotMatch(portable, /(?:src|href)="\.\//);
const script = portable.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(script, 'Missing embedded JavaScript');
new Script(script[1], {filename: 'DEMO.html'});
for (const page of [html, portable]) {
  const link = page.match(/<a class="download-project" href="([^"]+)"/);
  assert.equal(link?.[1], config.downloadUrl, 'Unexpected trial download link');
}

const files=[];async function walk(dir){for(const name of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,name.name);if(name.isDirectory())await walk(path);else files.push(path);}}await walk(dist);
for(const file of files){if(file.endsWith('.zip'))continue;const text=await readFile(file,'utf8');for(const match of text.matchAll(/https?:\/\/[^\s"'<>`)]+/g)){assert.ok(!match[0].includes('.site'),'Unexpected external demo host in static build: '+match[0]);}}
console.log('Static Pages app, portable demo and trial URL verified');
