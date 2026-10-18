# -*- coding: utf-8 -*-
"""
Cross-document drift check for the Boomball figures.

    python .claude/scripts/check_drift.py

Exits 1 if two documents disagree, or if a figure has gone missing from a
document that used to carry it. 0 when everything agrees.

Why this exists
---------------
On 2026-09-06 an audit found `context/CONTEXT.md` claiming 261 tests, "3,6 à 4,5
buts par match" and "trois séances de test", when the authority
`boomball/docs/04-etat-des-lieux.md` said 273, "1,66 à 2,29" and five, and the
engine said `SPARK_POINTS = 20` after CONTEXT.md's summary was written around a
value of 50. Nothing in the workspace could see that. A summary drifts silently
because nobody re-reads it against its source; code does not.

The rule the numbers follow: **`04-etat-des-lieux.md` and the engine constants
are the authority. `CONTEXT.md` is a dated summary and it is the one that gets
corrected.**

Scope
-----
`04-etat-des-lieux.md` deliberately keeps stale figures deeper in the file: each
section dates its own numbers and says so. Only its header block, the quoted
summary before the first `##`, carries the current state. Sources are therefore
read with a scope, and that document is always read as `header`. Without this,
the check reports "3 à 5 buts par match" from a section describing an objective
set two phases ago.

Adding a figure
---------------
Append to FACTS. Each entry names the figure, and for each document a regex whose
first group is the value. A document that never mentions the figure is skipped;
a document whose regex matches nothing but that is marked `required` is an error,
which is how a figure quietly disappearing from a summary gets caught.
"""
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):      # accents lisibles dans une console Windows
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent.parent

CONTEXT = "CONTEXT.md"
ETAT = "docs/04-etat-des-lieux.md"
CONSTANTS = "engine/constants.ts"
REGLEMENT = "docs/00-reglement-v2.md"

FACTS = [
    {
        "name": "nombre de tests",
        "authority": ETAT,
        "scope": {ETAT: "header"},
        "sources": {
            CONTEXT: (r"(\d+)\s+tests\b", True),
            ETAT: (r"\*\*(\d+)\s+tests", True),
        },
    },
    {
        "name": "buts par match",
        "authority": ETAT,
        "scope": {ETAT: "header"},
        "sources": {
            CONTEXT: (r"([\d,]+\s*à\s*[\d,]+)\s+buts par match", True),
            ETAT: (r"([\d,]+\s*à\s*[\d,]+)\s+buts par\s*\n?\s*match", True),
        },
    },
    {
        "name": "points du Spark",
        "authority": CONSTANTS,
        "scope": {ETAT: "header"},
        "sources": {
            CONSTANTS: (r"SPARK_POINTS\s*=\s*(\d+)", True),
            CONTEXT: (r"Spark\s+(?:vaut|vaudra|est à)?\s*(\d+)\s+points", False),
            ETAT: (r"le Spark vaut\s+(\d+)\s+points", False),
        },
    },
    {
        "name": "seances de test en local",
        "authority": ETAT,
        "scope": {ETAT: "header"},
        "sources": {
            CONTEXT: (r"apr[èe]s\s+(\w+)\s+s[ée]ances de test", True),
            ETAT: (r"apr[èe]s\s+(\w+)\s+tests en local", True),
        },
    },
]


def read(rel, scope):
    text = (ROOT / rel).read_text(encoding="utf-8")
    if scope == "header":
        cut = text.find(chr(10) + "## ")
        head = text[:cut] if cut != -1 else text
        # The header is a blockquote, so a wrapped sentence carries "> " mid-phrase.
        # Strip the marker so a pattern can span the wrap.
        return re.sub(r"^\s*>\s?", "", head, flags=re.M)
    return text


def normalise(value):
    """Compare 1,66 à 2,29 with 1,66 à 2,29 regardless of spacing."""
    return " ".join(value.replace("\n", " ").split()).lower()


def main():
    problems = 0
    for fact in FACTS:
        print(f"\n{fact['name']}")
        found = {}
        for rel, (pattern, required) in fact["sources"].items():
            path = ROOT / rel
            if not path.exists():
                print(f"  ABSENT   {rel} : fichier introuvable")
                problems += 1
                continue
            m = re.search(pattern, read(rel, fact.get("scope", {}).get(rel)), re.I)
            if not m:
                if required:
                    print(f"  MANQUANT {rel} : la valeur n'y figure plus")
                    problems += 1
                else:
                    print(f"  (absent) {rel} : pas mentionne, normal")
                continue
            found[rel] = normalise(m.group(1))
            print(f"  {found[rel]:<16} {rel}")

        values = set(found.values())
        if len(values) > 1:
            authority = fact["authority"]
            ref = found.get(authority)
            print(f"  DIVERGENCE. Autorite : {authority}"
                  + (f" dit {ref}" if ref else " n'a pas rendu de valeur"))
            for rel, val in found.items():
                if ref is not None and val != ref:
                    print(f"    -> {rel} dit {val} et doit etre corrige")
            problems += 1

    print(f"\n{'AUCUNE DERIVE' if problems == 0 else str(problems) + ' probleme(s)'}")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
