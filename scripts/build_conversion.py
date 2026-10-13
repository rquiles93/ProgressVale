import csv, io, json, re, shutil, zipfile
from pathlib import Path
from statistics import mean
from PIL import Image
from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'ABLLS-R-Output'; SEC=OUT/'Sections'; AUD=OUT/'Audits'; CROPS=OUT/'Source_Crops'; QA=OUT/'QA'; SCRIPTS=OUT/'Scripts'
for p in (SEC,AUD,CROPS,QA,SCRIPTS): p.mkdir(parents=True,exist_ok=True)
sections=[
('A','Cooperation and Reinforcer Effectiveness',13,16),('B','Visual Performance',17,22),('C','Receptive Language',23,32),
('D','Motor Imitation',33,37),('E','Vocal Imitation',38,41),('F','Requests',42,46),('G','Labeling',47,54),
('H','Intraverbal',55,63),('I','Spontaneous Vocalizations',64,65),('J','Syntax and Grammar',66,68),
('K','Play and Leisure Skills',69,72),('L','Social Interactions',73,78),('M','Group Instruction',79,80),
('N','Follow Classroom Routines',81,82),('P','Generalized Responding',83,83),('Q','Reading Skills',84,86),
('R','Math Skills',87,90),('S','Writing Skills',91,92),('T','Spelling',93,93),('U','Dressing Skills',94,95),
('V','Eating Skills',96,96),('W','Grooming Skills',97,97),('X','Toileting Skills',98,99),
('Y','Gross Motor Skills',100,102),('Z','Fine Motor Skills',103,105)]
headers=['Task','Score','Task Name','Task Objective','Question','Examples','Criteria','Notes']
audit=[]; unresolved=[]; task_total=0

def load_page(page):
    base=f'page-{page:03d}.json'; p=(ROOT/'tmp'/'ocr_fixed'/base) if (page==31 or 54<=page<=63 or 67<=page<=105) else (ROOT/'tmp'/'ocr_json'/base)
    return json.loads(p.read_text(encoding='utf8'))
def image_path(page):
    return (ROOT/'tmp'/'source_pages_fixed'/f'page-{page:03d}.png') if (page==31 or 54<=page<=63 or 67<=page<=105) else (ROOT/'tmp'/'source_pages'/f'page-{page:03d}.png')
def words(page):
    out=[]
    for ln in load_page(page)['tsv'].splitlines():
        p=ln.split('\t')
        if len(p)<12 or not p[11].strip(): continue
        try: out.append(dict(text=p[11].strip(),x=int(p[6]),y=int(p[7]),w=int(p[8]),h=int(p[9]),conf=float(p[10]),line=(int(p[4]),int(p[5]))))
        except: pass
    return out
def clean(s):
    s=re.sub(r'\s+',' ',s).strip(' |[]')
    return s.replace('�','[unclear]')
def page_rows(page,letter):
    ws=words(page); im=Image.open(image_path(page)); W,H=im.size
    a=np.array(im.convert('L')); ink=(a[:,int(.05*W):int(.97*W)]<80).sum(1); ys=np.where(ink>int(.55*.92*W))[0]
    groups=[]
    for y in ys:
        if not groups or y>groups[-1][-1]+1: groups.append([int(y)])
        else: groups[-1].append(int(y))
    grid_lines=[round(mean(g)) for g in groups]
    bounds=[.06,.11,.175,.275,.43,.565,.70,.79,.965]
    rows=[]
    for i in range(max(0,len(grid_lines)-1)):
        y,y2=grid_lines[i],grid_lines[i+1]
        vals=[]; confs=[]
        for c in range(8):
            x1,x2=bounds[c]*W,bounds[c+1]*W
            cw=[w for w in ws if x1<=w['x']<x2 and y-4<=w['y']<y2-2]
            byline={}
            for w in cw: byline.setdefault((w['line'],w['y']),[]).append(w)
            lines=[]
            for _,lw in sorted(byline.items(),key=lambda kv:kv[0][1]): lines.append(' '.join(x['text'] for x in sorted(lw,key=lambda z:z['x'])))
            vals.append(clean(' '.join(lines))); confs.append(mean([w['conf'] for w in cw]) if cw else 0)
        rows.append((vals,confs,(y,y2),W,H))
    return rows
def shade(cell,fill):
    tcPr=cell._tc.get_or_add_tcPr(); shd=OxmlElement('w:shd'); shd.set(qn('w:fill'),fill); tcPr.append(shd)
def set_repeat(row):
    trPr=row._tr.get_or_add_trPr(); el=OxmlElement('w:tblHeader'); el.set(qn('w:val'),'true'); trPr.append(el)
def add_table_doc(code,title,page_start,page_end):
    global task_total
    doc=Document(); sec=doc.sections[0]; sec.orientation=WD_ORIENT.LANDSCAPE; sec.page_width=Inches(11); sec.page_height=Inches(8.5); sec.left_margin=sec.right_margin=Inches(.35); sec.top_margin=sec.bottom_margin=Inches(.4)
    p=doc.add_paragraph(); p.style='Title'; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=p.add_run(f'{code} {title}'); r.font.name='Arial'; r.font.size=Pt(14); r.font.color.rgb=None
    table=doc.add_table(rows=1,cols=8); table.style='Table Grid'; table.autofit=False
    widths=[.45,.65,1.05,1.55,1.45,1.45,1.75,1.75]
    for j,h in enumerate(headers):
        table.cell(0,j).width=Inches(widths[j]); table.cell(0,j).text=h; shade(table.cell(0,j),'D9EAF7')
        for run in table.cell(0,j).paragraphs[0].runs: run.bold=True; run.font.size=Pt(8); run.font.name='Arial'
    set_repeat(table.rows[0])
    seq=0
    for pg in range(page_start,page_end+1):
        for vals,confs,yr,W,H in page_rows(pg,code):
            seq+=1; vals[0]=f'{code}{seq}'
            task_total+=1; cells=table.add_row().cells
            crop_ref=''
            row_review=min(confs[1:])<45 or any(not vals[k] for k in range(2,7))
            if row_review:
                crop=CROPS/f'{code}_{vals[0]}_p{pg}.png'; im=Image.open(image_path(pg)); im.crop((int(.05*W),max(0,yr[0]-8),int(.97*W),min(H,yr[1]+8))).save(crop); crop_ref=str(crop)
            for j,v in enumerate(vals):
                cells[j].width=Inches(widths[j]); cells[j].text=v; cells[j].vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
                for par in cells[j].paragraphs:
                    par.paragraph_format.space_after=Pt(0)
                    for run in par.runs: run.font.name='Arial'; run.font.size=Pt(7)
                status='REVIEW REQUIRED' if (confs[j]<45 or (j>=2 and not v)) else 'UNVERIFIED'
                rec=[code,vals[0],headers[j],pg,v,'Local Tesseract OCR; coordinate-based reconstruction; not human source-image verified',status,'Low confidence or missing OCR text' if status=='REVIEW REQUIRED' else '',status=='REVIEW REQUIRED',crop_ref]
                audit.append(rec)
                if status=='REVIEW REQUIRED': unresolved.append(rec)
    path=SEC/f'ABLLS_R_Section_{code}.docx'; doc.save(path); return path
docs=[]
for s in sections: docs.append(add_table_doc(*s))

def supplemental(name,title,pages):
    doc=Document(); p=doc.add_paragraph(); p.style='Title'; p.add_run(title)
    for pg in pages:
        doc.add_heading(f'Original PDF page {pg}',level=1); t=doc.add_table(rows=1,cols=1); t.style='Table Grid'; t.cell(0,0).text=clean(load_page(pg)['text']) or '[No text recognized]'
        audit.append([name,'',f'Page {pg} OCR text',pg,t.cell(0,0).text,'Local Tesseract OCR; page-level editable transcription','UNVERIFIED','Page-level layout not reconstructed',False,''])
    path=SEC/f'ABLLS_R_{name}.docx'; doc.save(path); docs.append(path)
supplemental('Front_Matter_and_Tracking','ABLLS-R Front Matter and Skill Tracking System',range(1,13))
supplemental('Appendices','ABLLS-R Appendices',range(107,149))

cols=['Section','Task Identifier','Field or Cell Name','Original PDF Page','Extracted Text','Verification Method','Verification Status','Detected Discrepancy','Human Review Required','Source Crop']
def write_xlsx(path,rows,title):
    wb=Workbook(); ws=wb.active; ws.title=title; ws.append(cols)
    for r in rows: ws.append(r)
    for c in ws[1]: c.font=Font(bold=True,color='FFFFFF'); c.fill=PatternFill('solid',fgColor='1F4E78'); c.alignment=Alignment(wrap_text=True)
    ws.freeze_panes='A2'; ws.auto_filter.ref=ws.dimensions
    widths=[12,16,22,14,70,48,20,35,20,65]
    for i,w in enumerate(widths,1): ws.column_dimensions[get_column_letter(i)].width=w
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment=Alignment(vertical='top',wrap_text=True)
    wb.save(path)
write_xlsx(AUD/'Complete_Audit_Report.xlsx',audit,'Complete Audit')
write_xlsx(AUD/'Unresolved_Discrepancies.xlsx',unresolved,'Unresolved')
status={s:sum(1 for r in audit if r[6]==s) for s in ['VERIFIED','UNVERIFIED','CORRECTED','REVIEW REQUIRED']}
(QA/'Structural_Validation.txt').write_text(f'PDF pages processed: 148\nAssessment sections: 25\nSupplemental DOCX files: 2\nTasks identified: {task_total}\nCells audited: {len(audit)}\nStatuses: {status}\nDOCX files: {len(docs)}\n',encoding='utf8')
(QA/'Rendered_Document_Inspection.txt').write_text('Pending automated render and visual inspection. See per-document render manifests in this folder.\n',encoding='utf8')
shutil.copy2(ROOT/'scripts'/'ocr_batch.mjs',SCRIPTS/'ocr_batch.mjs'); shutil.copy2(Path(__file__),SCRIPTS/'build_conversion.py')
(OUT/'README.md').write_text(f'''# ABLLS-R editable conversion\n\nSource: Skye_Holley_ABLLS-R_Protocol.pdf (148 pages).\n\nThis package contains 25 section DOCX files, front matter/tracking and appendices DOCX files, audit workbooks, source crops, QA results, and reproducible scripts.\n\nImportant limitation: automated OCR and rendering do not establish exact textual accuracy. No cell is marked VERIFIED unless manually checked against the original source image. Current status counts: {status}. Review every UNVERIFIED and REVIEW REQUIRED cell before clinical or educational use.\n''',encoding='utf8')
zip_path=ROOT/'ABLLS_R_All_Sections.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for p in docs+[AUD/'Complete_Audit_Report.xlsx',AUD/'Unresolved_Discrepancies.xlsx',OUT/'README.md']:
        z.write(p,p.relative_to(ROOT))
print(json.dumps({'tasks':task_total,'cells':len(audit),'statuses':status,'docs':len(docs),'zip':str(zip_path)}))
