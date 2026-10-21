"""Run all tests and write PROGRESS.md: one exercise = one test file, solved when all its tests pass."""
import collections
import datetime
import os
import pathlib
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
XML = ROOT / ".progress.xml"

SECTIONS = [
    ("A1-python-fluency", "A1 · Python fluency"),
    ("A2-online-test/01-strings-stack", "A2 · Strings & stacks"),
    ("A2-online-test/02-arrays-window-search", "A2 · Arrays, windows, binary search"),
    ("A2-online-test/03-lists-trees-heaps", "A2 · Linked lists, trees, heaps, intervals"),
    ("A2-online-test/04-graphs", "A2 · Graphs"),
    ("A2-online-test/05-dynamic-programming", "A2 · Dynamic programming"),
    ("A2-online-test/06-sql", "A2 · SQL"),
    ("A2-online-test/07-mock-tests", "A2 · Mock tests (algorithms)"),
]


def main():
    subprocess.run([sys.executable, "-m", "pytest", "-q", f"--junitxml={XML}"],
                   cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    status = collections.defaultdict(lambda: "solved")
    for case in ET.parse(XML).getroot().iter("testcase"):
        f = case.get("file") or case.get("classname", "").replace(".", "/") + ".py"
        f = str(pathlib.Path(f)).replace("\\", "/")
        if case.find("skipped") is not None:
            status[f] = "skipped" if status[f] != "todo" else "todo"
        elif case.find("failure") is not None or case.find("error") is not None:
            status[f] = "todo"
        else:
            status[f]  # default solved
    XML.unlink(missing_ok=True)

    files = {str(p.relative_to(ROOT)): p for p in ROOT.glob("A*/**/test_*.py")}
    for f in files:
        if not any(k.endswith(pathlib.Path(f).name) for k in status):
            status[f] = "todo"

    def state(rel):
        name = pathlib.Path(rel).name
        hits = [v for k, v in status.items() if k.endswith(name)]
        return hits[0] if hits else "todo"

    lines = ["# Progress", "",
             f"_Updated {datetime.date.today().isoformat()} by `make progress`. "
             "One exercise = one test file; it counts as solved when all its tests pass._", ""]
    total = solved = 0
    rows = []
    for folder, label in SECTIONS:
        tests = sorted(f for f in files if f.startswith(folder + "/"))
        done = [t for t in tests if state(t) == "solved"]
        skipped = [t for t in tests if state(t) == "skipped"]
        total += len(tests)
        solved += len(done)
        bar = "█" * round(10 * len(done) / len(tests)) + "░" * (10 - round(10 * len(done) / len(tests))) if tests else ""
        note = " (PostgreSQL not running: `make db`)" if skipped else ""
        rows.append(f"| {label} | {len(done)}/{len(tests)} | `{bar}`{note} |")
    lines += [f"**{solved} of {total} exercises solved**", "",
              "| Section | Solved | |", "|---|---|---|", *rows, "", "## Exercises", ""]
    for folder, label in SECTIONS:
        tests = sorted(f for f in files if f.startswith(folder + "/"))
        if not tests:
            continue
        lines.append(f"### {label}")
        for t in tests:
            mark = {"solved": "x", "skipped": " ", "todo": " "}[state(t)]
            name = pathlib.Path(t).stem.removeprefix("test_")
            lines.append(f"- [{mark}] `{name}`")
        lines.append("")
    out = "\n".join(lines)
    (ROOT / "PROGRESS.md").write_text(out)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as fh:
            fh.write(out)
    print(f"{solved}/{total} exercises solved. PROGRESS.md updated.")


if __name__ == "__main__":
    main()
