import {readFile,readdir,lstat} from 'node:fs/promises';
import {join,basename} from 'node:path';
// Small dependency-free ZIP writer (stored entries, UTF-8 names, CRC32).
const table=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
export async function createSourceArchive(root,archiveName){
 if(!/^[a-z0-9-]+\.zip$/.test(archiveName))throw Error('Invalid archive name');
 const entries=[];const prefix=basename(archiveName,'.zip');
 async function add(relative){
  const path=join(root,relative),stat=await lstat(path).catch(()=>null);
  if(!stat||stat.isSymbolicLink())return;
  if(stat.isDirectory()){for(const name of (await readdir(path)).sort())await add(relative+'/'+name);}
  else if(stat.isFile())entries.push({name:Buffer.from(prefix+'/'+relative),data:await readFile(path)});
 }
 // Exclude the generated DEMO.html because it embeds this ZIP.
 // The allowlist also excludes secrets, Git metadata and other build outputs.
 for(const path of ['.github','.gitignore','LICENSE','README.md','START_HERE.md','tags.txt','description.txt','package.json','package-lock.json','download-config.json','docs','scripts','src','tests','web'])await add(path);
 const local=[],central=[];let offset=0;
 for(const {name,data} of entries){
  const crc=crc32(data),header=Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(0x5c21,12);
  header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
  local.push(header,name,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(0x5c21,14);
  c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);
  offset+=header.length+name.length+data.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]);
}
