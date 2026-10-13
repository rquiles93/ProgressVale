import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createWorker } = require('C:/Users/roila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/tesseract.js');
const worker = await createWorker('eng', 1, {
  langPath: new URL('../node_modules/@tesseract.js-data/eng/4.0.0_best_int/', import.meta.url).pathname.replace(/^\//, ''),
  gzip: true,
  cacheMethod: 'none',
});
await worker.setParameters({ preserve_interword_spaces: '1' });
const ret = await worker.recognize(process.argv[2]);
console.log(ret.data.text);
await worker.terminate();
