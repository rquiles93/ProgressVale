from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
import json
root=Path(__file__).resolve().parent
pages={
17:([203,313,469,718,1162,1538,1904,2405,3105],[467,925,1212,1566,1754,2104]),
18:([203,313,469,718,1162,1538,1904,2405,3105],[367,559,827,1380,1660,1965,2276]),
19:([203,313,469,718,1162,1538,1904,2405,3105],[467,733,1042,1343,1620,2088]),
20:([203,313,469,718,1162,1538,1904,2405,3105],[367,804,1399,1800,2158]),
21:([203,313,469,718,1162,1538,1904,2405,3105],[467,1023,1388,1693,2214]),
22:([203,313,469,718,1162,1538,1904,2405,3105],[367,689,1004,1288])}
fields=['task','score','task_name','task_objective','question','examples','criteria','notes']
n=1; manifest=[]
for page,(xs,ys) in pages.items():
 im=Image.open(root/'source_pages'/f'page-{page:03d}.png').convert('L')
 for r in range(len(ys)-1):
  task=f'B{n}'
  for c,field in enumerate(fields):
   box=(xs[c]+4,ys[r]+4,xs[c+1]-4,ys[r+1]-4)
   crop=ImageEnhance.Sharpness(ImageOps.autocontrast(im.crop(box))).enhance(1.4)
   name=f'{task}_{field}_p{page}.png'; crop.save(root/'cells'/name)
   manifest.append({'task':task,'field':field,'page':page,'box':box,'file':name})
  n+=1
(root/'cell_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(f'Created {len(manifest)} cell crops for {n-1} tasks')
