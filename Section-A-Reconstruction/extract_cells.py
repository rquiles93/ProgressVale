from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
import json

root = Path(__file__).resolve().parent
pages = {
    13: ([203,313,469,718,1162,1538,1904,2405,3105],[474,666,902,1335,1534,2122]),
    14: ([203,313,469,718,1162,1538,1904,2405,3105],[374,760,1154,1707,2051]),
    15: ([203,313,469,718,1162,1538,1904,2405,3105],[474,822,1127,1442,1838,2264]),
    16: ([203,313,469,718,1162,1538,1904,2405,3105],[374,810,1126,1352,1550,1827]),
}
fields=['task','score','task_name','task_objective','question','examples','criteria','notes']
task_no=1; manifest=[]
for page,(xs,ys) in pages.items():
    im=Image.open(root/'source_pages'/f'page-{page:03d}.png').convert('L')
    for r in range(len(ys)-1):
        task=f'A{task_no}'
        for c,field in enumerate(fields):
            box=(xs[c]+4,ys[r]+4,xs[c+1]-4,ys[r+1]-4)
            crop=im.crop(box)
            crop=ImageOps.autocontrast(crop)
            crop=ImageEnhance.Sharpness(crop).enhance(1.4)
            name=f'{task}_{field}_p{page}.png'
            crop.save(root/'cells'/name)
            manifest.append({'task':task,'field':field,'page':page,'box':box,'file':name})
        task_no+=1
(root/'cell_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(f'Created {len(manifest)} cell crops for {task_no-1} tasks')
