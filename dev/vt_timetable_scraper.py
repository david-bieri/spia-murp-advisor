"""
VT Timetable Scraper for Jane MURP Advising UI
===============================================
Run once per semester to refresh timetable data in src/content/.

Usage:
    python vt_timetable_scraper.py --term 202609                          # JSON (default)
    python vt_timetable_scraper.py --term 202609 --format md              # Markdown for Jane
    python vt_timetable_scraper.py --term 202609 --format md --out src/content/murp_timetable_f26.md
    python vt_timetable_scraper.py --term 202609 --debug-html UAP         # Dump raw HTML for one subject

Term codes:
    YYYY01 = Spring    (e.g. 202701)
    YYYY06 = Summer    (e.g. 202606)
    YYYY09 = Fall      (e.g. 202609)

Banner column structure (confirmed via debug-html):
    cells[0]  CRN (hyperlink)
    cells[1]  Course number (e.g. UAP-5174)
    cells[2]  Title
    cells[3]  Schedule type (L=Lecture, I=Independent, R=Research...)
    cells[4]  Modality
    cells[5]  Credits
    cells[6]  Capacity
    cells[7]  Instructor
    cells[8]  Days
    cells[9]  Begin time
    cells[10] End time
    cells[11] Location / Building code  ← campus derived from here
    cells[12] Exam code
"""

import requests
import json
import argparse
import sys
import os
import re
from collections import Counter
from datetime import datetime, timezone
from bs4 import BeautifulSoup

BASE_URL = "https://selfservice.banner.vt.edu/ssb/HZSKVTSC.P_ProcRequest"

SPIA_SUBJECTS = ["UAP", "GIA", "CPAP", "SPIA", "PAPA"]

# Building codes that identify Arlington/NCR campus
ARLINGTON_BUILDINGS = {"NOVAC", "NVC", "VTRCA"}

# ARR/TBA course types — placeholders, not real scheduled sections
ARR_TITLES = {
    "Independent Study",
    "Research and Thesis",
    "Research and Dissertation",
    "Field Study",
    "Field Work/Practicum",
    "Undergraduate Research",
    "Internship",
    "Project and Report",
    "Final Examination",
    "Practicum Problem",
}

HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://selfservice.banner.vt.edu/ssb/HZSKVTSC.P_DispRequest",
    "User-Agent": "Mozilla/5.0 (compatible; MURP-Advisor-Script/1.0)",
}

TERM_LABELS = {"01": "Spring", "06": "Summer", "09": "Fall"}


def term_label(termyear: str) -> str:
    year = termyear[:4]
    sem = termyear[4:]
    return f"{TERM_LABELS.get(sem, sem)} {year}"


def fetch_raw_html(termyear: str, subject: str) -> str:
    payload = {
        "CAMPUS": "0",
        "TERMYEAR": termyear,
        "CORE_CODE": "AR%",
        "subj_code": subject,
        "CRSE_NUMBER": "",
        "crn": "",
        "open_only": "",
        "sess_code": "",
        "disp_comments_in": "N",
        "BTN_PRESSED": "FIND class sections",
        "inst": "",
        "class_type": "",
        "SCHDTYP": "",
        "CAMP_DIV": "",
    }
    resp = requests.post(BASE_URL, data=payload, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def course_level(course_number: str) -> int:
    m = re.search(r"(\d{4})", course_number)
    return int(m.group(1)) if m else 0


def building_to_campus(location: str) -> str:
    """
    Derive campus from Banner building code.
    NOVAC / NVC / VTRCA → Arlington/NCR
    ONLINE               → Online (both campuses)
    TBA / empty          → TBA
    everything else      → Blacksburg
    """
    loc = location.strip().upper()
    bldg = loc.split()[0] if loc else ""
    if bldg in ARLINGTON_BUILDINGS:
        return "Arlington/NCR"
    if loc in ("ONLINE", "ONLINE COURSE - VL"):
        return "Online"
    if loc in ("TBA", ""):
        return "TBA"
    return "Blacksburg"


def is_banner_header_row(cells: list) -> bool:
    """Skip Banner's own column header row."""
    return cells[0].get_text(strip=True).lower() in ("course", "crn", "#")


def parse_timetable_html(html: str, subject: str, termyear: str) -> list[dict]:
    """
    Parse Banner timetable HTML.

    Banner renders all sections as a flat sequence of cells in the table —
    BeautifulSoup's find_all('tr') traverses nested elements and recovers the
    individual section rows. Each section row has 13 cells (cols 0-12 above).
    """
    soup = BeautifulSoup(html, "html.parser")
    courses = []

    table = soup.find("table", {"class": "dataentrytable"})
    if not table:
        return courses

    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue

        # Skip course-group header rows (single colspan cell)
        if len(cells) == 1 and cells[0].get("colspan"):
            continue

        # Skip Banner's column header row
        if len(cells) >= 5 and is_banner_header_row(cells):
            continue

        # Need at least 12 cells for a complete section row
        if len(cells) < 12:
            continue

        crn_cell = cells[0].find("a")
        crn = crn_cell.get_text(strip=True) if crn_cell else cells[0].get_text(strip=True)

        # Skip non-numeric CRNs (stray header fragments)
        if not crn.isdigit():
            continue

        course_num = cells[1].get_text(strip=True)
        if course_level(course_num) < 5000:
            continue

        begin = cells[9].get_text(strip=True)
        end   = cells[10].get_text(strip=True)
        if "(ARR)" in begin or not begin or begin.startswith("---"):
            time_range = "ARR"
        else:
            time_range = f"{begin}–{end}"

        location = cells[11].get_text(strip=True)
        campus = building_to_campus(location)

        section = {
            "term": termyear,
            "term_label": term_label(termyear),
            "subject": subject,
            "crn": crn,
            "course_number": course_num,
            "title": cells[2].get_text(strip=True),
            "schedule_type": cells[3].get_text(strip=True),
            "modality": cells[4].get_text(strip=True),
            "credits": cells[5].get_text(strip=True),
            "capacity": cells[6].get_text(strip=True),
            "instructor": cells[7].get_text(strip=True),
            "days": cells[8].get_text(strip=True),
            "time_range": time_range,
            "location": location,
            "campus": campus,
        }
        courses.append(section)

    return courses


def fetch_subject(termyear: str, subject: str) -> list[dict]:
    html = fetch_raw_html(termyear, subject)
    return parse_timetable_html(html, subject, termyear)


def scrape_all(termyear: str) -> dict:
    all_courses = []
    errors = []

    for subj in SPIA_SUBJECTS:
        print(f"  Fetching {subj} for {term_label(termyear)}...", end=" ", flush=True)
        try:
            sections = fetch_subject(termyear, subj)
            all_courses.extend(sections)
            arr_count = sum(1 for s in sections if s["title"] in ARR_TITLES)
            real_count = len(sections) - arr_count
            campuses = Counter(s["campus"] for s in sections if s["title"] not in ARR_TITLES)
            campus_str = ", ".join(f"{v} {k}" for k, v in sorted(campuses.items()))
            print(f"{len(sections)} sections ({real_count} scheduled [{campus_str}], {arr_count} ARR/TBA)")
        except Exception as e:
            print(f"ERROR: {e}")
            errors.append({"subject": subj, "error": str(e)})

    return {
        "term": termyear,
        "term_label": term_label(termyear),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "subjects": SPIA_SUBJECTS,
        "section_count": len(all_courses),
        "courses": all_courses,
        "errors": errors,
    }


def to_markdown(data: dict) -> str:
    """
    Convert scraped timetable data to a Jane-readable markdown KB file.
    Sections are grouped by subject then by campus.
    ARR placeholder rows are collapsed to a bullet summary.
    Undergraduate courses are excluded.
    """
    term = data["term_label"]
    fetched = data["fetched_at"][:10]
    lines = []

    lines.append(f"# MURP Timetable of Classes — {term}")
    lines.append(f"<!-- src/content/murp_timetable_{term.lower().replace(' ', '')}.md -->")
    lines.append(f"<!-- Auto-generated by vt_timetable_scraper.py on {fetched} -->")
    lines.append(f"<!-- UPDATE EACH SEMESTER. Do not edit manually. -->")
    lines.append("")
    lines.append("## How Jane should use this file")
    lines.append("")
    lines.append(
        "When a student asks about course availability, meeting times, instructors, "
        "or whether a specific course is offered this semester, consult this file. "
        "Only graduate-level courses (5000+) are listed. Sections are grouped by "
        "campus — confirm a student's campus before advising on availability. "
        "Courses marked ARR have no fixed meeting time; students register by "
        "arrangement with their advisor. Online sections are available to students "
        "at both campuses. Always remind students to verify current seat availability "
        "in HokieSPA, as this file reflects the schedule at time of generation."
    )
    lines.append("")
    lines.append(f"**Term:** {term}  ")
    lines.append(f"**Generated:** {fetched}  ")
    lines.append(f"**Subjects covered:** {', '.join(data['subjects'])}  ")

    scheduled = [c for c in data["courses"] if c["title"] not in ARR_TITLES]
    lines.append(f"**Scheduled sections (excludes ARR/TBA):** {len(scheduled)}  ")
    lines.append("")

    CAMPUS_ORDER = ["Blacksburg", "Arlington/NCR", "Online", "TBA"]

    by_subject: dict[str, list[dict]] = {}
    for s in data["courses"]:
        by_subject.setdefault(s["subject"], []).append(s)

    for subj in SPIA_SUBJECTS:
        sections = by_subject.get(subj, [])
        if not sections:
            continue

        lines.append(f"## {subj} Courses")
        lines.append("")

        scheduled_sections = [s for s in sections if s["title"] not in ARR_TITLES]
        arr_sections       = [s for s in sections if s["title"] in ARR_TITLES]

        # Group scheduled sections by campus
        by_campus: dict[str, list[dict]] = {}
        for s in scheduled_sections:
            by_campus.setdefault(s["campus"], []).append(s)

        for campus in CAMPUS_ORDER:
            campus_sections = by_campus.get(campus, [])
            if not campus_sections:
                continue

            lines.append(f"### {subj} — {campus}")
            lines.append("")
            lines.append("| Course | Title | Credits | Instructor | Days | Time | Location | Modality | CRN |")
            lines.append("|---|---|---|---|---|---|---|---|---|")

            for s in campus_sections:
                def esc(v: str) -> str:
                    return v.replace("|", "/").strip() or "—"
                lines.append(
                    f"| {esc(s['course_number'])} "
                    f"| {esc(s['title'])} "
                    f"| {esc(s['credits'])} "
                    f"| {esc(s['instructor'])} "
                    f"| {esc(s['days'])} "
                    f"| {esc(s['time_range'])} "
                    f"| {esc(s['location'])} "
                    f"| {esc(s['modality'])} "
                    f"| {esc(s['crn'])} |"
                )
            lines.append("")

        if arr_sections:
            arr_counts = Counter(s["title"] for s in arr_sections)
            lines.append(f"**{subj} ARR/TBA** (register by arrangement with advisor):")
            lines.append("")
            for title, count in sorted(arr_counts.items()):
                lines.append(f"- {title}: {count} section(s) available")
            lines.append("")

    if data.get("errors"):
        lines.append("## Fetch Errors")
        lines.append("")
        for err in data["errors"]:
            lines.append(f"- **{err['subject']}**: {err['error']}")
        lines.append("")

    return "\n".join(lines)


def debug_html(termyear: str, subject: str) -> None:
    """Dump raw HTML and print structured row breakdown for campus field investigation."""
    out_file = f"{subject.lower()}_debug.html"
    print(f"\nFetching raw HTML for {subject} {term_label(termyear)}...")
    html = fetch_raw_html(termyear, subject)

    with open(out_file, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Raw HTML saved → {out_file}")

    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", {"class": "dataentrytable"})
    if not table:
        print("No dataentrytable found.")
        return

    rows = table.find_all("tr")
    print(f"\nFound {len(rows)} rows. Showing first 15 with >=12 cells:\n")

    shown = 0
    for i, row in enumerate(rows):
        cells = row.find_all("td")
        if len(cells) < 12:
            continue
        crn = cells[0].get_text(strip=True)
        if not crn.isdigit():
            continue
        course = cells[1].get_text(strip=True)
        title  = cells[2].get_text(strip=True)[:30]
        modality = cells[4].get_text(strip=True)[:25]
        credits  = cells[5].get_text(strip=True)
        instructor = cells[7].get_text(strip=True)
        days   = cells[8].get_text(strip=True)
        begin  = cells[9].get_text(strip=True)
        end    = cells[10].get_text(strip=True)
        loc    = cells[11].get_text(strip=True)
        campus = building_to_campus(loc)
        print(f"  CRN={crn} | {course} | {title:<30} | {credits}cr | {days:<6} | {begin}-{end} | loc={loc:<12} → {campus}")
        shown += 1
        if shown >= 15:
            break

    print(f"\nColumn legend confirmed:")
    print("  cells[4]=Modality  cells[5]=Credits  cells[7]=Instructor")
    print("  cells[8]=Days  cells[9]=Begin  cells[10]=End  cells[11]=Location/Campus")
    print(f"\nFull HTML → {out_file}")


def default_out(termyear: str, fmt: str) -> str:
    sem = termyear[4:]
    year = termyear[2:4]
    sem_code = {"01": "s", "06": "su", "09": "f"}.get(sem, sem)
    ext = "md" if fmt == "md" else "json"
    return f"courses_{sem_code}{year}.{ext}"


def main():
    parser = argparse.ArgumentParser(description="Scrape VT Timetable for MURP advising")
    parser.add_argument("--term", required=True, help="Term code e.g. 202609 for Fall 2026")
    parser.add_argument("--format", choices=["json", "md"], default="json")
    parser.add_argument("--out", default=None)
    parser.add_argument("--debug-html", metavar="SUBJECT",
                        help="Dump raw HTML + row breakdown for one subject (e.g. --debug-html GIA)")
    args = parser.parse_args()

    termyear = args.term
    if len(termyear) != 6 or not termyear.isdigit():
        print("ERROR: --term must be a 6-digit code like 202609")
        sys.exit(1)

    if args.debug_html:
        debug_html(termyear, args.debug_html.upper())
        return

    out_file = args.out or default_out(termyear, args.format)

    print(f"\nScraping VT Timetable: {term_label(termyear)} ({termyear})")
    print(f"Subjects: {', '.join(SPIA_SUBJECTS)}")
    print(f"Format: {args.format}\n")

    data = scrape_all(termyear)

    out_dir = os.path.dirname(os.path.abspath(out_file))
    os.makedirs(out_dir, exist_ok=True)

    if args.format == "md":
        output = to_markdown(data)
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(output)
    else:
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    scheduled = sum(1 for c in data["courses"] if c["title"] not in ARR_TITLES)
    arr = data["section_count"] - scheduled
    print(f"\n✓ {data['section_count']} total sections → {out_file}")
    print(f"  {scheduled} scheduled, {arr} ARR/TBA (collapsed in MD)")
    if data.get("errors"):
        print(f"  ⚠ {len(data['errors'])} subject(s) failed: {[e['subject'] for e in data['errors']]}")

    if args.format == "md":
        print(f"\nNext steps:")
        print(f"  1. Review {out_file} — check campus groupings look right")
        print(f"  2. git add {out_file}")
        print(f"  3. git commit -m \"content: timetable refresh {term_label(termyear)}\"")
        print(f"  4. git push  →  Vercel auto-deploys")


if __name__ == "__main__":
    main()
