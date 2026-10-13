from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parent
pages=sorted((root/'rendered').glob('page-*.png'),key=lambda p:int(p.stem.split('-')[-1]))
out=root/'contact_sheets'; out.mkdir(exist_ok=True)
thumb_w,thumb_h=792,612; cols,rows=2,3
for batch in range(0,len(pages),cols*rows):
    canvas=Image.new('RGB',(cols*thumb_w,rows*(thumb_h+28)),'white'); draw=ImageDraw.Draw(canvas)
    for k,p in enumerate(pages[batch:batch+cols*rows]):
        im=Image.open(p).convert('RGB').resize((thumb_w,thumb_h))
        x=(k%cols)*thumb_w; y=(k//cols)*(thumb_h+28)
        canvas.paste(im,(x,y)); draw.text((x+8,y+610),f'Word page {batch+k+1}',fill='black')
    canvas.save(out/f'contact-{batch//(cols*rows)+1:02d}.png')
print(len(pages), 'pages', len(list(out.glob('contact-*.png'))), 'contact sheets')
