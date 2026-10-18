import {mkdir,cp,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'dist');
// The only recursive removal is the deterministic build folder inside this project.
if(path.dirname(out)!==path.resolve(root))throw new Error('Invalid build path');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const files=['index.html','immersive.css','immersive-app.js','data.js','mixer.js','storage.js','offline.js','scene-view.js','scene-motion.js','install.js','icons.js','sw.js','manifest.webmanifest','素材与授权.md','LICENSE','LICENSE-Moodist','_headers'];
for(const file of files)await copyFile(path.join(root,file),path.join(out,file));
await cp(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
console.log(`Built ${files.length} shell files plus assets → dist`);
