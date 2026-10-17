"""Deterministically extract the corrected ABLLS-R Word tables.

Run from web-app with the bundled Python runtime:
    python scripts/import-ablls-content.py
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "verified-documents"
OUTPUT = ROOT / "web-app" / "lib" / "ablls-content.v1.json"
IMAGE_DIR = ROOT / "web-app" / "public" / "protocol-examples" / "v1"
VERSION = "ablls-r-protocol-2013-corrected-2026-10-13"

SOURCES = [
    "ABLLS_R_Section_A_Reconstructed.docx",
    "ABLLS_R_Section_B_Reconstructed.docx",
    "ABLLS_R_Sections_C_to_Z_Complete.docx",
]

SECTION_NAMES = {
    "A": "Cooperation and Reinforcer Effectiveness",
    "B": "Visual Performance",
    "C": "Receptive Language",
    "D": "Motor Imitation",
    "E": "Vocal Imitation",
    "F": "Requests",
    "G": "Labeling",
    "H": "Intraverbals",
    "I": "Spontaneous Vocalizations",
    "J": "Syntax and Grammar",
    "K": "Play and Leisure Skills",
    "L": "Social Interaction",
    "M": "Group Instruction",
    "N": "Follow Classroom Routines",
    "P": "Generalized Responding",
    "Q": "Reading Skills",
    "R": "Math Skills",
    "S": "Writing Skills",
    "T": "Spelling",
    "U": "Dressing Skills",
    "V": "Eating Skills",
    "W": "Grooming Skills",
    "X": "Toileting Skills",
    "Y": "Gross Motor Skills",
    "Z": "Fine Motor Skills",
}

APPROVED = set("ABCDEFGHIKLMNPUVWX")
EXCLUDED = set("JQRSTYZ")
TASK_RE = re.compile(r"^([A-NP-Z])\s*(\d+)$")


def clean(value: str) -> str:
    return value.replace("\r", "").strip()


def images_for_cell(document: Document, cell, task_id: str) -> list[str]:
    paths: list[str] = []
    for index, blip in enumerate(cell._tc.xpath(".//a:blip"), start=1):
        relationship_id = blip.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
        if not relationship_id:
            continue
        part = document.part.related_parts[relationship_id]
        suffix = Path(str(part.partname)).suffix.lower() or ".png"
        blob = part.blob
        digest = hashlib.sha256(blob).hexdigest()[:12]
        filename = f"{task_id.lower()}-{index}-{digest}{suffix}"
        destination = IMAGE_DIR / filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists() or destination.read_bytes() != blob:
            destination.write_bytes(blob)
        paths.append(f"/protocol-examples/v1/{filename}")
    return paths


def main() -> None:
    tasks: list[dict] = []
    source_hashes: dict[str, str] = {}
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    for source_name in SOURCES:
        path = SOURCE_DIR / source_name
        if not path.exists():
            raise FileNotFoundError(path)
        source_hashes[source_name] = hashlib.sha256(path.read_bytes()).hexdigest()
        document = Document(path)
        for table in document.tables:
            for row in table.rows:
                match = TASK_RE.fullmatch(clean(row.cells[0].text))
                if not match:
                    continue
                section, number = match.groups()
                task_id = f"{section}{int(number)}"
                cells = [clean(cell.text) for cell in row.cells]
                if len(cells) < 8:
                    raise ValueError(f"{task_id}: expected 8 columns, found {len(cells)}")
                score_values = sorted({int(value) for value in re.findall(r"(?<!\d)[0-4](?!\d)", cells[1])})
                if not score_values or score_values[0] != 0:
                    raise ValueError(f"{task_id}: invalid score column {cells[1]!r}")
                tasks.append(
                    {
                        "id": task_id,
                        "sectionCode": section,
                        "order": len(tasks),
                        "taskName": cells[2],
                        "taskObjective": cells[3],
                        "question": cells[4],
                        "examples": cells[5],
                        "exampleImages": images_for_cell(document, row.cells[5], task_id),
                        "scoringCriteria": cells[6],
                        "validScores": score_values,
                        "maxScore": max(score_values),
                        "protocolNotes": cells[7],
                    }
                )

    identifiers = [task["id"] for task in tasks]
    if len(tasks) != 544 or len(set(identifiers)) != 544:
        raise ValueError(f"Expected 544 unique tasks, found {len(tasks)} / {len(set(identifiers))} unique")
    expected = [
        f"{code}{number}"
        for code in SECTION_NAMES
        for number in range(1, 1 + sum(1 for task in tasks if task["sectionCode"] == code))
    ]
    if identifiers != expected:
        raise ValueError("Task identifiers are incomplete or out of source order")

    sections = [
        {
            "code": code,
            "name": name,
            "order": index,
            "taskCount": sum(1 for task in tasks if task["sectionCode"] == code),
            "assessmentApproved": code in APPROVED,
            "permanentlyExcluded": code in EXCLUDED,
        }
        for index, (code, name) in enumerate(SECTION_NAMES.items())
    ]
    payload = {
        "version": VERSION,
        "sourceDocuments": source_hashes,
        "sections": sections,
        "tasks": tasks,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(sections)} sections and {len(tasks)} tasks to {OUTPUT}")


if __name__ == "__main__":
    main()
