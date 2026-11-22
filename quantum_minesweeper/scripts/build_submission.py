"""Build the PDF talk, circuit-rich speaker guide, and submission report.

Install optional artifact dependencies: pip install -e '.[artifacts]'
Then run: python scripts/export_native_circuit.py && python scripts/build_submission.py
The --renderer option supports a separate Python with PyMuPDF installed.
"""
import argparse
from html import escape
import json
import math
from pathlib import Path
import re
import subprocess
import sys

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                Preformatted, Image, KeepTogether, PageBreak)
from presentation_content import SLIDES

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf"
TMP = ROOT / "tmp/pdfs"
W, H = 960, 540
NAVY = colors.HexColor("#15283F")
TEAL = colors.HexColor("#087F8C")
ORANGE = colors.HexColor("#B9601D")
INK = colors.HexColor("#192C40")
MUTED = colors.HexColor("#536477")
LIGHT = colors.HexColor("#EEF4F5")
WHITE = colors.white


def fonts():
    candidates = [
        ("Q", ["/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]),
        ("QB", ["/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]),
        ("QC", ["/System/Library/Fonts/Supplemental/Courier New.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]),
    ]
    for name, paths in candidates:
        path = next((Path(p) for p in paths if Path(p).exists()), None)
        if path is None:
            raise RuntimeError(f"Install a Unicode font for {name}; checked {paths}")
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily("Q", normal="Q", bold="QB", italic="Q", boldItalic="QB")


def text(c, value, x, top, size=18, font="Q", color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, H - top - size, str(value).replace("⟩", "〉").replace("⟨", "〈"))


def para(c, value, x, top, width=840, size=18, color=INK, font="Q"):
    style = ParagraphStyle("slide", fontName=font, fontSize=size, leading=size * 1.32,
                           textColor=color, spaceAfter=0)
    p = Paragraph(escape(value.replace("⟩", "〉").replace("⟨", "〈")).replace("\n", "<br/>"), style)
    _, height = p.wrap(width, H)
    if top + height > H - 27:
        raise ValueError(f"Slide text overflows: {value[:60]}")
    p.drawOn(c, x, H - top - height)
    return height


def body(c, items, x=54, top=150, width=850, size=20, gap=17, color=INK):
    for value in items:
        height = para(c, value, x, top, width, size, color)
        top += height + gap
    return top


def line(c, x1, top1, x2, top2, color=MUTED, width=1):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, H - top1, x2, H - top2)


def box(c, x, top, label, width=38, height=29, fill=WHITE, size=14):
    c.setFillColor(fill)
    c.setStrokeColor(TEAL)
    c.setLineWidth(1.2)
    c.rect(x - width / 2, H - top - height / 2, width, height, fill=1, stroke=1)
    c.setFont("Q", size)
    c.setFillColor(INK)
    c.drawCentredString(x, H - top - size * .34, label)


def control(c, x, top):
    c.setFillColor(TEAL)
    c.circle(x, H - top, 4, fill=1, stroke=0)


def target(c, x, top):
    c.setStrokeColor(TEAL)
    c.setLineWidth(1.4)
    c.circle(x, H - top, 8, fill=0, stroke=1)
    line(c, x - 6, top, x + 6, top, TEAL, 1.4)
    line(c, x, top - 6, x, top + 6, TEAL, 1.4)


def cx(c, x, control_y, target_y):
    line(c, x, control_y, x, target_y, TEAL, 1.4)
    control(c, x, control_y)
    target(c, x, target_y)


def wires(c, labels, ys, start=145, end=850, size=15):
    for label, y in zip(labels, ys):
        text(c, label, 48, y - 10, size)
        line(c, start, y, end, y, MUTED, .85)


def table(c, headers, rows, widths, x=54, top=155, size=16, rowheight=36):
    for i, row in enumerate([headers] + rows):
        y = top + i * rowheight
        if i == 0:
            c.setFillColor(NAVY)
            c.rect(x, H - y - rowheight, sum(widths), rowheight, fill=1, stroke=0)
        elif i % 2:
            c.setFillColor(LIGHT)
            c.rect(x, H - y - rowheight, sum(widths), rowheight, fill=1, stroke=0)
        xx = x
        for value, width in zip(row, widths):
            para(c, str(value), xx + 10, y + 8, width - 18,
                 size if i else min(size, 14), WHITE if i == 0 else INK)
            xx += width


def code(c, lines, top=170, size=17):
    for row in lines:
        text(c, row, 60, top, size, "QC")
        top += size * 1.65


def native_panels(c, native, page):
    all_ops = native["instructions"]
    r_index = 0
    decorated = []
    for index, op in enumerate(all_ops):
        item = dict(op, sequence=index + 1)
        if op["name"] == "r":
            r_index += 1
            item["display"] = f"R{r_index}"
        decorated.append(item)
    chunk = decorated[page * 24:(page + 1) * 24]
    physical = native["active_physical_qubits"]
    for panel, subset in enumerate([chunk[:12], chunk[12:]]):
        if not subset:
            continue
        top = 163 + panel * 168
        text(c, f"Instructions {subset[0]['sequence']}-{subset[-1]['sequence']}", 54, top - 34, 14, color=MUTED)
        ys = {q: top + j * 32 for j, q in enumerate(physical)}
        wires(c, [f"QB{q + 1}" for q in physical], list(ys.values()), start=130, end=890, size=13)
        for j, op in enumerate(subset):
            x = 159 + j * 62
            name, qs = op["name"], op["qubits"]
            if name == "r":
                box(c, x, ys[qs[0]], op["display"], width=40, height=23, size=11)
            elif name == "cz":
                line(c, x, ys[qs[0]], x, ys[qs[1]], TEAL)
                for q in qs:
                    control(c, x, ys[q])
                text(c, "CZ", x - 9, min(ys[q] for q in qs) - 20, 9, color=TEAL)
            elif name == "barrier":
                line(c, x, min(ys.values()) - 9, x, max(ys.values()) + 9, ORANGE)
                label = {"encoded": "enc", "hidden_fault": "fault", "syndrome": "syn", "verification": "verify"}.get(op["label"], "bar")
                text(c, label, x - 14, max(ys.values()) + 10, 9, color=ORANGE)
            elif name == "measure":
                box(c, x, ys[qs[0]], "M", width=27, height=23, size=11)
                text(c, f"c{op['clbits'][0]}", x - 6, ys[qs[0]] + 13, 9)
            else:
                raise ValueError(f"Unhandled native operation: {name}")
    text(c, "Qubit labels are IQM names (physical index + 1). R parameters appear in the parameter legend.", 54, 478, 11, color=MUTED)


def slide(c, s, index, total, data, native):
    c.setFillColor(WHITE)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    if s["kind"] == "cover":
        c.setFillColor(NAVY)
        c.rect(0, 0, W, H, fill=1, stroke=0)
        text(c, s["title"], 58, 72, 49, "QB", WHITE)
        text(c, s["subtitle"], 60, 142, 25, color=colors.HexColor("#9DDBD8"))
        body(c, s["body"], 60, 220, 840, 22, 17, WHITE)
        for x, number, label in [(60, "703", "exact-state cases"), (365, "4 levels", "verified in simulation"), (680, "93.4%", "mean hardware survival")]:
            text(c, number, x, 385, 39, "QB", WHITE)
            text(c, label, x, 438, 16, color=colors.HexColor("#C9D5E2"))
        text(c, "QUBLITZ 2026   github.com/jamers7237/qublitz", 60, 493, 12, color=WHITE)
        c.showPage()
        return
    line(c, 54, 26, 905, 26, TEAL, 3)
    text(c, s["title"], 54, 43, 29, "QB")
    para(c, s["subtitle"], 54, 87, 850, 17, MUTED)
    kind = s["kind"]
    if kind == "noise":
        for x, number, label in [(60, "100%", "Ideal corrected outcomes"), (510, "93.4%", "Mean real-device survival")]:
            text(c, number, x, 157, 54, "QB", TEAL if x == 60 else ORANGE)
            text(c, label, x, 225, 18)
        body(c, s["body"], top=294, size=18, gap=17)
        text(c, "Sampling alone cannot cause failures when the ideal success probability is exactly one.", 54, 459, 15, color=ORANGE)
    elif kind == "notation":
        text(c, "|ψ⟩ = α|0⟩ + β|1⟩", 60, 154, 35, color=TEAL)
        body(c, s["body"], top=232, size=19, gap=18)
    elif kind == "levels":
        table(c, ["Level", "Allowed fault", "Method", "Evidence"],
              [["1", "I or one X", "Repetition code", "Ideal + real IQM"],
               ["2", "I or one Z", "H-rotated code", "Simulation"],
               ["3", "I or one Y", "S-rotated code", "Simulation"],
               ["4", "I or one X/Y/Z", "ZZZZ + XXXX", "Simulation"]],
              [70, 190, 270, 310], top=160, rowheight=50, size=18)
        para(c, "Levels 1-3 recover the logical state. Level 4 identifies type and preserves the error-shifted data.", 60, 439, 830, 19)
    elif kind == "encoding":
        ys = [220, 280, 340]
        wires(c, ["q0  |ψ⟩", "q1  |0⟩", "q2  |0⟩"], ys)
        cx(c, 350, ys[0], ys[1]); cx(c, 560, ys[0], ys[2])
        text(c, "α|000⟩ + β|111⟩", 620, 172, 24, color=TEAL)
        para(c, "The two codewords have matching pairwise parity, even when their amplitudes are unknown.", 60, 405, 830, 21)
        text(c, "Diagram order: q0, q1, q2. Printed Qiskit strings reverse the order.", 60, 464, 14, color=MUTED)
    elif kind == "explicit":
        ys = [195, 242, 289, 357, 404]
        wires(c, ["q0", "q1", "q2", "a0 |0⟩", "a1 |0⟩"], ys, start=135, end=570)
        for x, control_i, target_i in [(200,0,3),(280,1,3),(360,1,4),(440,2,4)]:
            cx(c, x, ys[control_i], ys[target_i])
        box(c, 530, ys[3], "M"); box(c, 530, ys[4], "M")
        table(c, ["Fault", "s0 s1"], [["I","00"],["X0","10"],["X1","11"],["X2","01"]], [125,145], x=630, top=170, size=18, rowheight=43)
        para(c, "Each helper learns a relationship. It does not read the individual logical value.", 60, 448, 830, 18)
    elif kind == "compact":
        ys = [240, 300, 360]
        wires(c, ["q0 |ψ⟩", "q1 |0⟩", "q2 |0⟩"], ys, end=905)
        for xx, label in [(190,"Encode"),(340,"Fault"),(460,"Decode"),(630,"Recover"),(805,"Verify")]:
            text(c, label, xx-26, 174, 15, color=TEAL)
        cx(c, 180, ys[0], ys[1]); cx(c, 240, ys[0], ys[2])
        box(c, 340, ys[0], "X")
        cx(c, 445, ys[0], ys[1]); cx(c, 505, ys[0], ys[2])
        line(c, 630, ys[0], 630, ys[2], TEAL, 1.5)
        target(c, 630, ys[0]); control(c, 630, ys[1]); control(c, 630, ys[2])
        box(c, 790, ys[0], "U†", width=42); box(c, 860, ys[0], "M")
        box(c, 860, ys[1], "M"); box(c, 860, ys[2], "M")
        text(c, "logical", 836, 207, 12); text(c, "s0", 886, 288, 13); text(c, "s1", 886, 348, 13)
        para(c, "Compact syndrome: I=00, X0=11, X1=10, X2=01. U† undoes known test preparation.", 60, 424, 830, 18)
    elif kind == "worked":
        table(c, ["Stage", "State or interpretation"],
              [["Encode", "α|000⟩ + β|111⟩"], ["Inject X0", "α|100⟩ + β|011⟩"],
               ["Decode", "(α|1⟩ + β|0⟩) |11⟩"], ["Toffoli recovery", "(α|0⟩ + β|1⟩) |11⟩"]],
              [240, 600], top=155, rowheight=62, size=23)
        text(c, "The work bits reveal the error. The logical amplitudes survive.", 60, 464, 20, color=TEAL)
    elif kind == "frames":
        table(c, ["Level", "Frame", "Fault becomes", "Encoded state"],
              [["1", "I", "I X I = X", "α|000⟩ + β|111⟩"],
               ["2", "H", "H Z H = X", "α|+++⟩ + β|---⟩"],
               ["3", "S", "S† Y S = X", "α|000⟩ - iβ|111⟩"]],
              [80, 110, 250, 400], rowheight=65, size=21)
        para(c, "Undo the frame after the fault, then reuse the compact decoder. The error-axis promise matters.", 60, 441, 830, 20)
    elif kind in ("zcheck", "xcheck"):
        ys = [186, 231, 276, 321, 400]
        helper = "q4 |0⟩" if kind == "zcheck" else "q5 |0⟩"
        wires(c, ["q0", "q1", "q2", "q3", helper], ys, start=145, end=645)
        if kind == "zcheck":
            for j, xx in enumerate([230,310,390,470]): cx(c, xx, ys[j], ys[4])
            box(c, 590, ys[4], "M")
            table(c, ["State", "Helper"], [["0000","0"],["1111","0"],["1000","1"],["0111","1"]], [130,105], x=680, top=177, size=17, rowheight=43)
            para(c, "Even parity gives +1 and helper 0. Odd parity gives -1 and helper 1.", 60, 451, 830, 18)
        else:
            box(c, 178, ys[4], "H")
            for j, xx in enumerate([255,325,395,465]): cx(c, xx, ys[4], ys[j])
            box(c, 540, ys[4], "H"); box(c, 610, ys[4], "M")
            para(c, "0000 + 1111\nGlobal flip sign: +1\nHelper outcome: 0", 685, 175, 225, 18, TEAL)
            para(c, "0000 - 1111\nGlobal flip sign: -1\nHelper outcome: 1", 685, 305, 225, 18, ORANGE)
            para(c, "The helper interferes the do-nothing and global-flip alternatives.", 60, 451, 830, 18)
    elif kind == "types":
        table(c, ["Fault type", "ZZZZ helper", "XXXX helper"], [["I","0","0"],["X","1","0"],["Z","0","1"],["Y","1","1"]], [280,280,280], top=150, rowheight=45, size=22)
        para(c, "All four locations of the same type share the syndrome. These two checks do not select a recovery location.", 60, 422, 830, 21)
    elif kind == "verification":
        text(c, "703", 60, 158, 89, "QB", TEAL)
        text(c, "exact-state cases", 65, 265, 22)
        body(c, s["body"], x=370, top=163, width=530, size=20, gap=20)
        text(c, "3 levels × 2 designs × 4 faults × 19 inputs + 13 faults × 19 inputs", 60, 428, 19)
        text(c, "Minimum recorded fidelity: 0.999999999999996", 60, 464, 18, color=MUTED)
    elif kind == "pipeline":
        steps = [("1", "Python / Qiskit", "Build logical circuit"), ("2", "Live IQM target", "Compile gates and routing"),
                 ("3", "Resonance", "Submit a native batch"), ("4", "Garnet hardware", "Repeat shots and measure"),
                 ("5", "Saved job result", "Decode counts and report")]
        for j, (n, title, detail) in enumerate(steps):
            top = 151 + j * 64
            text(c, n, 60, top, 29, "QB", TEAL)
            text(c, title, 113, top, 22, "QB")
            text(c, detail, 435, top + 3, 19)
            if j < 4: line(c, 110, top + 48, 900, top + 48, LIGHT, 1)
    elif kind == "hardware":
        witness = [r for r in data["records"] if r["state"] == "plus_i" and r["error"] == "X0"]
        for j, r in enumerate(witness):
            y = 198 + j * 110
            m = r["metrics"]; value = m["logical_fidelity_estimate"]; ci = m["logical_ci95"]
            color = TEAL if r["correction"] else ORANGE
            text(c, "Recovery" if r["correction"] else "Disabled", 60, y + 8, 22)
            c.setFillColor(LIGHT); c.rect(270, H-y-48, 510, 48, fill=1, stroke=0)
            c.setFillColor(color); c.rect(270, H-y-48, 510*value, 48, fill=1, stroke=0)
            line(c, 270+510*ci[0], y+24, 270+510*ci[1], y+24, INK, 2)
            for x in ci: line(c, 270+510*x, y+16, 270+510*x, y+32, INK, 2)
            text(c, f"{value:.1%}", 800, y + 4, 29, "QB", color)
        para(c, "Individual 95% Wilson intervals. Different physical layouts limit a causal recovery-gate comparison.", 60, 421, 830, 18)
        text(c, "16 circuits × 256 shots. Mean corrected survival across both inputs: 93.4%.", 60, 474, 15, color=MUTED)
    elif kind == "allresults":
        rows=[]
        for state in ("plus", "plus_i"):
            for error in ("I","X0","X1","X2"):
                pair = {r["correction"]:r["metrics"] for r in data["records"] if r["state"]==state and r["error"]==error}
                rows.append(["plus" if state=="plus" else "plus-i", error,
                             f"{pair[True]['logical_fidelity_estimate']:.2%}", f"{pair[False]['logical_fidelity_estimate']:.2%}",
                             f"{pair[True]['syndrome_accuracy']:.2%}"])
        table(c, ["Input", "Fault", "Recovery", "Disabled", "Syndrome"], rows, [150,100,195,195,200], top=139, rowheight=37, size=17)
        text(c, "All shots count. Hardware inputs: plus and plus-i. Per-row intervals are in the report.", 60, 481, 14, color=MUTED)
    elif kind == "limits":
        body(c, s["body"], top=155, size=21, gap=25)
        para(c, "Expected ideal limits: two X faults can cause a logical flip, and a Z fault can escape level-1 parity checks.", 60, 409, 830, 20, ORANGE)
    elif kind == "commands":
        code(c, s["body"], top=165, size=19)
        para(c, "The offline demo shows circuits, all allowed faults, expected failures, and saved real-hardware counts.", 60, 335, 830, 21)
        para(c, "New hardware execution uses separate compile, submit, and fetch commands. Only submission spends QPU credits.", 60, 423, 830, 18, MUTED)
    elif kind == "next":
        body(c, s["body"], top=152, size=21, gap=23)
        text(c, "A new fifth level is optional. A controlled experiment is a stronger next step.", 60, 457, 19, color=TEAL)
    elif kind == "matrices":
        text(c, "Z = [ 1   0 ]       X = [ 0   1 ]", 65, 153, 25, "QC", TEAL)
        text(c, "    [ 0  -1 ]           [ 1   0 ]", 65, 190, 25, "QC", TEAL)
        body(c, s["body"], top=259, size=19, gap=13)
        text(c, "ZZZZ and XXXX are 16 × 16 tensor-product operators, not four repeated gates on one qubit.", 60, 470, 15, color=MUTED)
    elif kind == "field":
        text(c, "H_code = Δ Σ (I - G_a) / 2", 65, 153, 32, color=TEAL)
        body(c, s["body"][1:], top=235, size=21, gap=22)
        para(c, "Finite spin/stabilizer model. No continuum QFT, anyon braiding, or physical topological protection is claimed.", 60, 432, 830, 18, MUTED)
    elif kind == "metrics":
        table(c, ["Metric", "Successful shots", "Fraction"],
              [["Logical verification", "234 / 256", "91.41%"], ["Expected syndrome", "219 / 256", "85.55%"],
               ["Both conditions", "211 / 256", "82.42%"]], [410,230,200], top=159, rowheight=64, size=23)
        para(c, "Printed key 110 means s1=1, s0=1, logical=0. We sum every logical-zero shot, including unexpected syndromes.", 60, 436, 830, 19)
    elif kind == "iqmcommands":
        code(c, ["python -m quantum_minesweeper iqm --backend garnet --levels 1",
                 "  --states plus,plus_i --controls --shots 256",
                 "  --output results/iqm-new-pilot",
                 "python -m quantum_minesweeper iqm-submit --output results/iqm-new-pilot",
                 "python -m quantum_minesweeper iqm-fetch --output results/iqm-new-pilot"], top=160, size=15)
        para(c, "The first command is shown across three lines for readability. Join it as one shell command, or use backslash continuations.", 60, 325, 830, 17, MUTED)
        para(c, "Compile only, then paid submission, then retrieval. Existing pilot evidence needs no new paid run.", 60, 408, 830, 21)
    elif kind == "rubric":
        table(c, ["Required deliverable", "Artifact"],
              [["Code repository", "github.com/jamers7237/qublitz"], ["Challenge results", "results/SUMMARY.md and raw JSON"],
               ["IQM implementation", "native circuit, job ID, counts, observations"], ["Live demonstration", "PDF talk, circuit guide, offline demo"]],
              [310,530], top=159, rowheight=57, size=20)
        text(c, "Full assessment crosswalk: docs/SUBMISSION.md", 60, 454, 20, color=TEAL)
    elif kind in ("phasecircuit", "ycircuit"):
        ys=[225,290,355]
        wires(c,["q0 |ψ⟩","q1 |0⟩","q2 |0⟩"],ys,start=145,end=905)
        cx(c,178,ys[0],ys[1]); cx(c,230,ys[0],ys[2])
        gate,undo,fault=("H","H","Z") if kind=="phasecircuit" else ("S","S†","Y")
        for y in ys: box(c,310,y,gate,width=32)
        box(c,415,ys[1],fault,width=32)
        for y in ys: box(c,520,y,undo,width=32)
        cx(c,625,ys[0],ys[1]); cx(c,680,ys[0],ys[2])
        line(c,805,ys[0],805,ys[2],TEAL,1.5); target(c,805,ys[0]); control(c,805,ys[1]); control(c,805,ys[2])
        for xx,label in [(195,"Repetition"),(293,"Frame"),(394,"Fault"),(489,"Undo frame"),(632,"Decode"),(776,"Recover")]:
            text(c,label,xx,164,13,color=TEAL)
        para(c,f"Shown fault is {fault}1. The same circuit handles any single permitted location. Output q0 is recovered before terminal verification.",60,426,830,19)
    elif kind=="explicitrecovery":
        ys=[190,235,280,365,410]
        wires(c,["q0","q1","q2","a0=s0","a1=s1"],ys,start=145,end=910)
        for xx,ti,pattern in [(280,0,(1,0)),(455,1,(1,1)),(630,2,(0,1))]:
            line(c,xx,ys[ti],xx,ys[4],TEAL,1.5); target(c,xx,ys[ti])
            for yy,value in zip(ys[3:],pattern):
                if value: control(c,xx,yy)
                else:
                    c.setFillColor(WHITE); c.setStrokeColor(TEAL); c.circle(xx,H-yy,4,fill=1,stroke=1)
            text(c,"".join(str(v) for v in pattern),xx-12,145,17,color=TEAL)
        cx(c,740,ys[0],ys[1]); cx(c,800,ys[0],ys[2])
        text(c,"Decode",735,145,16,color=TEAL)
        para(c,"Each syndrome selects one recovery. Hollow controls trigger on zero and use X wrappers in the code. The final two CNOTs decode the corrected state.",60,451,830,17)
    elif kind.startswith("native") and kind != "nativeparams":
        native_panels(c, native, int(kind[-1]))
    elif kind == "nativeparams":
        rotations = [x for x in native["instructions"] if x["name"]=="r"]
        rows = [[f"R{i+1}", f"{r['params'][0]:.5f}", f"{r['params'][1]:.5f}"] for i,r in enumerate(rotations)]
        for half in range(2):
            table(c, ["Gate", "θ radians", "φ radians"], rows[half*13:(half+1)*13], [62,155,155],
                  x=54+half*455, top=139, rowheight=24, size=12)
        text(c, "R(θ,φ) rotates about an axis in the XY plane. CZ uses the native coupled qubits.", 60, 489, 12, color=MUTED)
    else:
        body(c, s["body"], size=21)
    line(c, 54, 506, 905, 506, colors.HexColor("#D9E2E7"))
    text(c, s["source"], 54, 513, 9, color=MUTED)
    c.setFillColor(MUTED); c.setFont("Q", 10)
    c.drawRightString(906, 17, f"{index + 1} / {total}")
    c.showPage()


def document_styles():
    styles = getSampleStyleSheet()
    for name in styles.byName:
        styles[name].fontName = "Q"
        styles[name].textColor = INK
    styles["Normal"].fontSize=10.5; styles["Normal"].leading=15; styles["Normal"].spaceAfter=9
    styles["Title"].fontName="QB"; styles["Title"].fontSize=27; styles["Title"].leading=33
    styles["Heading1"].fontName="QB"; styles["Heading1"].fontSize=17; styles["Heading1"].leading=22; styles["Heading1"].spaceBefore=16
    styles["Heading2"].fontName="QB"; styles["Heading2"].fontSize=13; styles["Heading2"].leading=18; styles["Heading2"].spaceBefore=12
    styles.add(ParagraphStyle("CodeQ",fontName="QC",fontSize=8.1,leading=11,spaceAfter=12))
    styles.add(ParagraphStyle("CellQ",fontName="Q",fontSize=8.5,leading=11))
    styles.add(ParagraphStyle("SourceQ",fontName="Q",fontSize=8.4,leading=11,textColor=MUTED,spaceAfter=10))
    return styles


def inline(value):
    value=escape(value)
    value=re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" color="#087F8C">\1</a>', value)
    value=re.sub(r"`([^`]+)`", r'<font name="QC">\1</font>', value)
    return value


def footer(c, doc):
    c.saveState(); width,height=doc.pagesize
    c.setStrokeColor(colors.HexColor("#D9E2E7")); c.line(44,37,width-44,37)
    c.setFont("Q",8); c.setFillColor(MUTED)
    c.drawString(44,24,"Quantum Minesweeper / QUBLITZ 2026")
    c.drawRightString(width-44,24,str(doc.page)); c.restoreState()


def markdown_story(value, styles):
    lines=value.splitlines(); story=[]; i=0
    while i<len(lines):
        row=lines[i]
        if not row.strip(): i+=1; continue
        if row.startswith("```"):
            i+=1; collected=[]
            while i<len(lines) and not lines[i].startswith("```"):
                collected.append(lines[i]); i+=1
            story.append(Preformatted("\n".join(collected),styles["CodeQ"])); i+=1; continue
        if row.startswith("|"):
            collected=[]
            while i<len(lines) and lines[i].startswith("|"):
                cells=[s.strip() for s in lines[i].strip("|").split("|")]
                if not all(re.match(r"^[-: ]+$",s) for s in cells): collected.append(cells)
                i+=1
            n=len(collected[0]); width=524/n
            items=[[Paragraph(inline(cell),styles["CellQ"]) for cell in r] for r in collected]
            t=Table(items,colWidths=[width]*n,repeatRows=1,hAlign="LEFT")
            t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),LIGHT),("VALIGN",(0,0),(-1,-1),"TOP"),
                                   ("BOTTOMPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),7),
                                   ("LINEBELOW",(0,0),(-1,0),.7,TEAL),("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE,colors.HexColor("#F8FAFB")])]))
            story += [t,Spacer(1,12)]; continue
        if row.startswith("# "): story.append(Paragraph(inline(row[2:]),styles["Title"]))
        elif row.startswith("## "): story.append(Paragraph(inline(row[3:]),styles["Heading1"]))
        elif row.startswith("- "): story.append(Paragraph("• "+inline(row[2:]),styles["Normal"]))
        else:
            collected=[row]; i+=1
            while i<len(lines) and lines[i].strip() and not lines[i].startswith(("#","|","```","- ")):
                collected.append(lines[i]); i+=1
            story.append(Paragraph(inline(" ".join(collected)),styles["Normal"])); continue
        i+=1
    return story


def pdf_document(path, story):
    doc=SimpleDocTemplate(str(path),pagesize=(612,792),leftMargin=44,rightMargin=44,topMargin=44,bottomMargin=51,
                          title=path.stem.replace("_"," "),author="Quantum Minesweeper team")
    doc.build(story,onFirstPage=footer,onLaterPages=footer)


GUIDE_INTRO = """# Presenter guide

## What to use during the live talk

Present Quantum_Minesweeper_Presentation.pdf. This guide explains each slide and includes circuit images beside the relevant notes. The appendices include the actual Garnet native circuit, its R-gate parameter legend, and further logical circuits. The source diagrams in the presentation PDF are vector graphics. Use Submission_Report.pdf as the written evidence summary, and docs/SUBMISSION.md as the repository's assessment crosswalk.

For a five-minute talk, use slides 1, 4, 7, 9, 12, 13, 15, 17, and 18. Explain the problem and promises, the compact circuit, basis changes, type detection, tests, real evidence, limitations, and demo. Keep the remaining slides ready for questions. For an eight-to-ten-minute talk use slides 1-19, spending less time on notation if the audience knows it. Appendix slides support detailed questions.

## The answer to why accuracy was below 100%

The recovery rule is deterministic under the stated ideal error model. A real device introduces additional faults during the circuit and measurement. The measured 93.4% is input-state survival for corrected hardware circuits, including preparation and readout. It is not a claim that the decoder randomly chooses the wrong rule. Our exact simulation is effectively 100%. Finite shots make the physical estimate uncertain, but sampling alone cannot generate a failure when the ideal success probability is exactly one.

## Circuit symbols

A horizontal wire is one qubit. Time runs left to right. A filled dot marks a control. A circled plus marks an X target. Together they form a CNOT. A Toffoli has two filled controls and one circled-plus target. A box H is a Hadamard. A box M is measurement. A box U-dagger reverses known test preparation. A native CZ has two filled dots. R1, R2, and so on name actual native rotation gates with parameters in the legend. Orange vertical markers in the native diagram are compiler barriers, not physical gates.

## Running the offline live demo

```sh
source .venv/bin/activate
python scripts/live_demo.py --verify
# Optional: pause for Enter between steps
python scripts/live_demo.py --verify --pause
```

This demo reads the saved real Garnet measurements and does not contact IQM. It shows all allowed fault locations and two expected failures outside the model. Do not call its playback of saved counts a new live hardware execution. Show the real job ID and raw JSON as evidence of the completed run.

## Likely judging questions

- Why does syndrome measurement preserve the state? Both logical codewords have the same check eigenvalues, so the check learns the fault sector without distinguishing logical amplitudes.
- Is the injected error known? The test harness knows it for injection and scoring. The recovery is fixed and has no location-selection input.
- Does the code clone the input? No. The encoded register has joint amplitudes, rather than independent copies of the unknown qubit.
- Why use plus-i? A residual logical X leaves plus unchanged but takes plus-i to an orthogonal state, so plus-i reveals an otherwise hidden failure.
- Why use an entangled reference? A measure-and-reprepare scheme can fake some classical outputs while destroying entanglement. The ideal reference test checks quantum correlations.
- Did we demonstrate fault tolerance? No. Gate faults, repeated rounds, and a matched memory benchmark remain outside this demonstration.
- What are additional levels? More of the four listed levels. We already cover all four in simulation. A new level is optional, and a well-controlled experiment is a useful creative extension.
- Why do corrected and control results differ beyond recovery? The circuits have different gate counts, routing, physical layouts, and durations. We explicitly disclose that limitation.

## Slide-by-slide notes and circuit walkthroughs
"""


def guide(slides, styles):
    story=markdown_story(GUIDE_INTRO,styles)
    for i,s in enumerate(slides):
        chunk = [Paragraph(f"Slide {i+1}. {escape(s['title'])}",styles["Heading1"]),
                 Paragraph(escape(s["subtitle"].replace("⟩","〉")),styles["SourceQ"])]
        if s["kind"] in {"encoding","explicit","compact","zcheck","xcheck","native0","native1","nativeparams","phasecircuit","ycircuit","explicitrecovery"}:
            image_path=TMP/"slides"/f"page-{i+1:02d}.png"
            chunk += [Image(str(image_path),width=524,height=294.75),Spacer(1,8)]
        chunk += [Paragraph(escape(s["notes"]),styles["Normal"]),
                  Paragraph("Evidence: "+escape(s["source"]),styles["SourceQ"])]
        story.append(KeepTogether(chunk))
    story += [PageBreak(),Paragraph("Hardware commands and source files",styles["Heading1"])]
    source=(ROOT/"docs/SUBMISSION.md").read_text()
    excerpt=source[source.index("## 10. Running the project"):]
    story += markdown_story(excerpt,styles)
    pdf_document(OUT/"Presenter_Guide.pdf",story)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--renderer",default=sys.executable)
    args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True); TMP.mkdir(parents=True,exist_ok=True)
    fonts()
    data=json.loads((ROOT/"results/iqm-pilot/results.json").read_text())
    native=json.loads((ROOT/"results/iqm-pilot/native_witness.json").read_text())
    slides=list(SLIDES)
    for page in range(2):
        slides.append(dict(title=f"Appendix: actual Garnet circuit ({page+1}/2)",
                           subtitle="Recorded |+i⟩ / X0 corrected circuit. Sequential display, not pulse timing",
                           kind=f"native{page}",body=[],
                           notes="This is an exact gate-sequence rendering of circuit index 10 in the saved compiled QPY file. It uses native physical indices 0,1,3,4, labeled QB1,QB2,QB4,QB5 using IQM names. The 26 R gates, 13 CZ gates, four barriers, and three measurements come from the real submitted witness circuit. Each R number points to its theta/phi parameter in the next appendix. CZ dots denote a controlled phase, unlike a CNOT target. The diagram spreads operations sequentially for legibility; actual independent gates can share layers, giving circuit depth 28. Barriers are compilation boundaries. The saved global phase is irrelevant to observed counts. Follow the actual measured classical-bit labels to locate logical verification c0 and syndrome c1,c2.",
                           source="results/iqm-pilot/native_witness.json; compiled.qpy, circuit 10"))
    slides.append(dict(title="Appendix: native rotation parameters",subtitle="All 26 R gates from the actual submitted witness circuit",kind="nativeparams",body=[],
                       notes="An R(theta,phi) gate rotates a qubit by theta about an axis in the XY plane with azimuth phi. The table shows radians, rounded to five decimal places for presentation. The machine-readable JSON and compiled QPY preserve the source parameters. These are not manually chosen pulse amplitudes or durations. The SDK and hardware compiler implement the native instructions. Reproducing a fresh run can yield different layouts, native sequences, and calibration parameters, so the actual saved artifact is the record for this experiment.",source="native_witness.json: exact parameters; table rounds to five decimals"))
    slides.extend([
        dict(title="Appendix: the level-2 circuit",subtitle="H on every data qubit turns the physical Z error into an X in the decoder frame",kind="phasecircuit",body=[],
             notes="Follow left to right. Two CNOTs first encode the input as a repetition-code state. Apply H to all three data qubits. A Z fault then acts at an unknown site; this diagram illustrates site 1. Apply H to all three again, converting that Z into X. The inverse-encoding CNOTs place the syndrome on q1 and q2. The fixed Toffoli repairs q0 if and only if the work bits are 11. A location-1 fault produces compact syndrome 10, so q0 is already correct and the Toffoli does not fire. Known inverse input preparation and measurements belong to the terminal experiment, after this recovery block. This circuit has simulation evidence only.",source="codes.py: encoder(2), frame(2), core(2)"),
        dict(title="Appendix: the level-3 circuit",subtitle="S before the fault and S-dagger after it account for both components of Y",kind="ycircuit",body=[],
             notes="Follow the same stages as level 2, replacing H with S during encoding and S-dagger when undoing the frame. A Y fault becomes X because S-dagger Y S=X. Both the bit and phase components are handled by this transformation. The same inverse-encoding CNOTs and one Toffoli then recover q0. The initial S rotations change the logical phase of the encoded one codeword to -i times 111, and their inverses restore the original logical convention. Merely applying ordinary X recovery to an unrotated repetition state hit by Y would leave a phase error. An alternative valid implementation could directly apply syndrome-selected Y recovery. Our frame version reuses one decoder. This circuit has simulation evidence only.",source="codes.py: encoder(3), frame(3), core(3)"),
        dict(title="Appendix: explicit syndrome-selected recovery",subtitle="Level 1 uses three conditional X operations, then decodes the corrected data",kind="explicitrecovery",body=[],
             notes="The two ancillas already store the explicit extraction syndrome. The first controlled operation flips q0 only for syndrome 10, the second flips q1 only for 11, and the third flips q2 only for 01. Syndrome 00 triggers no recovery. A hollow control means the operation is enabled when that qubit is zero. In the source code, X gates temporarily invert such controls around an ordinary Toffoli, then restore them. Because the logical state is recovered for every error sector, the ancillas can be measured at the end. The last two CNOTs decode the corrected repetition state. For levels 2 and 3, the source moves the data into and out of the corresponding basis around this same controlled-X block. These diagrams explain the compact-versus-explicit resource tradeoff.",source="codes.py: recover(); EXPLICIT_LOCATION")])
    c=canvas.Canvas(str(OUT/"Quantum_Minesweeper_Presentation.pdf"),pagesize=(W,H))
    c.setTitle("Quantum Minesweeper - QUBLITZ 2026"); c.setAuthor("Quantum Minesweeper team")
    for i,s in enumerate(slides): slide(c,s,i,len(slides),data,native)
    c.save()
    styles=document_styles()
    pdf_document(OUT/"Submission_Report.pdf",markdown_story((ROOT/"docs/SUBMISSION.md").read_text(),styles))
    subprocess.run([args.renderer,str(ROOT/"scripts/render_submission.py"),str(OUT/"Quantum_Minesweeper_Presentation.pdf"),str(TMP/"slides")],check=True)
    guide(slides,styles)
    for name in ("Presenter_Guide","Submission_Report"):
        subprocess.run([args.renderer,str(ROOT/"scripts/render_submission.py"),str(OUT/f"{name}.pdf"),str(TMP/name)],check=True)
    # An editable text version of the speaking notes is useful without PDF tooling.
    notes=["# Presenter notes", "", "Full circuit images are embedded in output/pdf/Presenter_Guide.pdf.", ""]
    for i,s in enumerate(slides): notes += [f"## Slide {i+1}: {s['title']}","",s["notes"],"","Evidence: "+s["source"],""]
    (ROOT/"docs/PRESENTER_NOTES.md").write_text("\n".join(notes))
    (OUT/"artifact_manifest.json").write_text(json.dumps({"slides":len(slides),"main_slides":19,"appendix_slides":len(slides)-19,
        "pdfs":["Quantum_Minesweeper_Presentation.pdf","Presenter_Guide.pdf","Submission_Report.pdf"],
        "evidence_job_id":data["job_id"],"circuits_include_native_witness":True},indent=2)+"\n")
    print("Built presentation, circuit-rich presenter guide, and submission report.")


if __name__=="__main__":
    main()
