"""Render every PDF page and check text stays within the page boundary."""
import json
from pathlib import Path
import sys
import pymupdf

source,directory=Path(sys.argv[1]),Path(sys.argv[2])
directory.mkdir(parents=True,exist_ok=True)
document=pymupdf.open(source)
outside=[]
for i,page in enumerate(document):
    page.get_pixmap(matrix=pymupdf.Matrix(1.3,1.3),alpha=False).save(directory/f"page-{i+1:02d}.png")
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines",[]):
            for span in line["spans"]:
                x0,y0,x1,y1=span["bbox"]
                if x0 < -1 or y0 < -1 or x1 > page.rect.width+1 or y1 > page.rect.height+1:
                    outside.append({"page":i+1,"text":span["text"]})
report={"pdf":source.name,"pages":len(document),"text_outside_page":outside}
(directory/"render_check.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report))
if outside:
    raise SystemExit(1)
