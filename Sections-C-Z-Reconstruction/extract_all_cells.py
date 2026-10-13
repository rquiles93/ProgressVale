from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
import numpy as np, json

root=Path(__file__).resolve().parent
norm=root/'normalized_pages'; norm.mkdir(exist_ok=True)
cells=root/'cells'; cells.mkdir(exist_ok=True)
fields=['task','score','task_name','task_objective','question','examples','criteria','notes']

def clusters(values):
    groups=[]
    for value in values:
        value=int(value)
        if not groups or value>groups[-1][-1]+1: groups.append([value])
        else: groups[-1].append(value)
    return [round(sum(g)/len(g)) for g in groups]

manifest=[]; page_layouts={}
for page in range(23,106):
    source=root/'source_pages'/f'page-{page:03d}.png'
    im=Image.open(source).convert('L')
    if im.height > im.width:
        im=im.transpose(Image.Transpose.ROTATE_90 if page==31 else Image.Transpose.ROTATE_270)
    im.save(norm/f'page-{page:03d}.png')
    a=np.array(im)<110; h,w=a.shape
    band=a[int(h*.12):int(h*.92)]
    run=np.zeros(w,dtype=np.int32); longest=np.zeros(w,dtype=np.int32)
    for scan in band:
        run=(run+1)*scan; longest=np.maximum(longest,run)
    xs=clusters(np.where(longest>100)[0])
    ys=clusters(np.where(a[:,int(w*.05):int(w*.95)].sum(1)>w*.55)[0])
    xs=[x for x in xs if 150<x<w-150]
    ys=[y for y in ys if 250<y<h-150]
    if len(xs)!=9 or len(ys)<2:
        raise RuntimeError(f'Grid detection failed page {page}: xs={xs}, ys={ys}')
    page_layouts[str(page)]={'xs':xs,'ys':ys,'rows':len(ys)-1}
    for row in range(len(ys)-1):
        for col,field in enumerate(fields):
            box=(xs[col]+4,ys[row]+4,xs[col+1]-4,ys[row+1]-4)
            crop=ImageEnhance.Sharpness(ImageOps.autocontrast(im.crop(box))).enhance(1.4)
            name=f'p{page:03d}_r{row+1:02d}_{field}.png'; crop.save(cells/name)
            manifest.append({'page':page,'row':row+1,'field':field,'box':box,'file':name})
(root/'page_layouts.json').write_text(json.dumps(page_layouts,indent=2),encoding='utf-8')
(root/'cell_manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(f'{len(page_layouts)} pages, {sum(v["rows"] for v in page_layouts.values())} rows, {len(manifest)} cells')
