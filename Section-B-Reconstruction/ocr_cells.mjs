import fs from 'fs'; import path from 'path'; import {createRequire} from 'module';
const require=createRequire(import.meta.url);
const {createWorker,createScheduler}=require('C:/Users/roila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/tesseract.js');
const root=path.resolve(process.argv[2]); const manifest=JSON.parse(fs.readFileSync(path.join(root,'cell_manifest.json'),'utf8'));
const scheduler=createScheduler(); const langPath=path.resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int');
for(let i=0;i<4;i++){const w=await createWorker('eng',1,{langPath,gzip:true,cacheMethod:'none'});await w.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});scheduler.addWorker(w);}
let done=0; const results=await Promise.all(manifest.map(async m=>{const r=await scheduler.addJob('recognize',path.join(root,'cells',m.file));done++;if(done%25===0)console.log(`${done}/${manifest.length}`);return {...m,text:r.data.text.trim(),confidence:r.data.confidence};}));
await scheduler.terminate(); fs.writeFileSync(path.join(root,'ocr','cell_ocr.json'),JSON.stringify(results,null,2)); console.log(`OCR complete: ${results.length} cells`);
