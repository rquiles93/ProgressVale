from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from docx import Document


TASK_CODE = re.compile(r"^[A-Z]\d+$")
APPROVED_SECTIONS = set("ABCDEFGHIKLMNPUVWX")


def extract(path: Path) -> dict[str, str]:
    examples: dict[str, str] = {}
    for table in Document(path).tables:
        for row in table.rows[1:]:
            code = row.cells[0].text.strip().upper()
            if not TASK_CODE.fullmatch(code):
                continue
            if code in examples:
                raise ValueError(f"Duplicate task code {code} in {path.name}")
            if code[0] not in APPROVED_SECTIONS:
                raise ValueError(f"Excluded or unexpected task code {code} in {path.name}")
            value = row.cells[2].text.strip()
            if not value:
                raise ValueError(f"Missing example for {code} in {path.name}")
            examples[code] = value
    return examples


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    verified = root / "verified-documents"
    content = json.loads((root / "web-app/lib/ablls-content.v1.json").read_text(encoding="utf-8"))
    expected = [task["id"] for task in content["tasks"] if task["sectionCode"] in APPROVED_SECTIONS]
    spanish = extract(verified / "ABLLS_R_403_Ejemplos_Sencillos_Revision.docx")
    english = extract(verified / "ABLLS_R_403_Simple_Examples_English.docx")
    for language, values in (("es", spanish), ("en", english)):
        if list(values) != expected:
            missing = [code for code in expected if code not in values]
            unexpected = [code for code in values if code not in expected]
            raise ValueError(f"{language}: task order mismatch; missing={missing}; unexpected={unexpected}")
    if set(spanish) != set(english):
        raise ValueError("English and Spanish task-code sets differ")
    output = {
        "sourceDocuments": {
            "es": "ABLLS_R_403_Ejemplos_Sencillos_Revision.docx",
            "en": "ABLLS_R_403_Simple_Examples_English.docx",
        },
        "examples": {code: {"en": english[code], "es": spanish[code]} for code in expected},
    }
    target = root / "web-app/lib/simple-examples.v1.json"
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(expected)} aligned bilingual examples to {target}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        raise
