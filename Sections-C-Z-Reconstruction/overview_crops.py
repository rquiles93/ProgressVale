from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent
out=root/'overview_crops'; out.mkdir(exist_ok=True)
items=[]
for page in range(23,121):
    p=root/'overview'/f'page-{page:03d}.png'
    if not p.exists(): continue
    im=Image.open(p).convert('L')
    w,h=im.size
    for kind,box in [('header',(0,0,w,int(h*.22))),('tasks',(0,int(h*.12),int(w*.16),int(h*.92)))]:
        name=f'p{page:03d}_{kind}.png'; im.crop(box).save(out/name)
        items.append({'page':page,'kind':kind,'file':name})
(root/'overview_manifest.json').write_text(json.dumps(items,indent=2),encoding='utf-8')
