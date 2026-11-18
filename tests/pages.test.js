import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolvePagesUrl,preparePages} from '../scripts/set-pages-url.mjs';
test('Pages URLs follow renamed repositories, user sites and configured domains',()=>{
 assert.equal(resolvePagesUrl({repository:'alice/project-one'}),'https://alice.github.io/project-one/');
 assert.equal(resolvePagesUrl({repository:'alice/new-name'}),'https://alice.github.io/new-name/');
 assert.equal(resolvePagesUrl({repository:'alice/alice.github.io'}),'https://alice.github.io/');
 assert.equal(resolvePagesUrl({baseUrl:'https://example.org/tools/demo'}),'https://example.org/tools/demo/');
 assert.throws(()=>resolvePagesUrl({baseUrl:'https://user:pass@example.org/'}));
});
test('README uses the configured release URL while updating the demo URL',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pages-readme-'));
 try{
  await writeFile(join(root,'README.md'),'# Keep this title\n<!-- pages-links:start -->old<!-- pages-links:end -->\nKeep the rest.');
  const downloadUrl = 'https://github.com/wordystepuncl/ai-arbitrage-bot/releases/download/Trial1.4/AI_trial_setup.zip';
  await writeFile(join(root,'download-config.json'),JSON.stringify({downloadUrl}));
  await preparePages(root,{baseUrl:'https://alice.github.io/renamed-repo/'});
  const text=await readFile(join(root,'README.md'),'utf8');
  assert.ok(text.includes('# Keep this title'));assert.ok(text.endsWith('Keep the rest.'));
  assert.ok(text.includes(`[![DOWNLOAD](docs/download-project.svg)](${downloadUrl})`));
  assert.ok(text.includes('[Live demo](https://alice.github.io/renamed-repo/)'));
 }finally{await rm(root,{recursive:true,force:true});}
});
