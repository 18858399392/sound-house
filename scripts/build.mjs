import {mkdir,cp,copyFile,rm,readFile} from 'node:fs/promises';
import {mediaFiles} from '../media-index.js';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(path.join(root,'assets/media-manifest.json'),'utf8'));
if(JSON.stringify(mediaFiles)!==JSON.stringify(manifest.files))throw new Error('media-index.js must match assets/media-manifest.json');
const out=path.join(root,'dist');
// The only recursive removal is the deterministic build folder inside this project.
if(path.dirname(out)!==path.resolve(root))throw new Error('Invalid build path');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const files=['index.html','immersive.css','immersive-app.js','data.js','mixer.js','storage.js','offline.js','media-index.js','scene-view.js','scene-motion.js','install.js','icons.js','sw.js','manifest.webmanifest','素材与授权.md','LICENSE','LICENSE-Moodist','_headers'];
for(const file of files)await copyFile(path.join(root,file),path.join(out,file));
await cp(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
console.log(`Built ${files.length} shell files plus assets → dist`);
