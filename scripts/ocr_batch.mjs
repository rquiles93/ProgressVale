import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createWorker, createScheduler } = require('C:/Users/roila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/tesseract.js');
const imageDir = process.argv[2], outDir = process.argv[3];
fs.mkdirSync(outDir, {recursive:true});
const langPath = path.resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int');
const scheduler = createScheduler();
for (let i=0;i<4;i++) {
  const w = await createWorker('eng', 1, {langPath, gzip:true, cacheMethod:'none'});
  await w.setParameters({preserve_interword_spaces:'1', tessedit_pageseg_mode:'3'});
  scheduler.addWorker(w);
}
const files = fs.readdirSync(imageDir).filter(f=>f.endsWith('.png')).sort();
let done=0;
await Promise.all(files.map(async f=>{
  const base=path.basename(f,'.png'), dest=path.join(outDir,base+'.json');
  if (fs.existsSync(dest)) { done++; return; }
  const r=await scheduler.addJob('recognize',path.join(imageDir,f),{}, {text:true,tsv:true});
  fs.writeFileSync(dest, JSON.stringify({text:r.data.text,tsv:r.data.tsv}));
  done++; if(done%10===0) console.log(`OCR ${done}/${files.length}`);
}));
await scheduler.terminate();
console.log(`OCR complete ${done}/${files.length}`);
