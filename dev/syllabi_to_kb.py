"""
syllabi_to_kb.py
----------------
Converts course syllabi PDFs, MURP theses, and rubric documents into structured
markdown knowledge-base files for the Jane MURP advising bot (src/content/).

Document types:
  - Course syllabi  : folders matching --prefix (UAP, GIA, SPIA, ...)
  - MURP theses     : folder specified by --thesis-folder
  - Rubric          : any PDF whose filename contains "rubric" in the thesis folder

Requirements:
    pip install anthropic pymupdf tqdm openpyxl

Environment:
    ANTHROPIC_API_KEY must be set (Windows: setx ANTHROPIC_API_KEY "sk-...")

Usage:
    python syllabi_to_kb.py `
      --folder "C:/syllabi" `
      --out "C:/kb_output" `
      --prefix UAP GIA SPIA `
      --thesis-folder "MURP thesis" `
      --meta-file "C:/MURP_Syllabi_Checklist.xlsx"

    --dry-run   : list files without calling API
    --reprocess : ignore previous log, reprocess everything
    --delay N   : seconds between API calls (default 1.5)
    --log PATH  : CSV log path (default kb_results.csv)
"""

import argparse
import csv
import os
import re
import sys
import time
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF not found. Run: pip install pymupdf")

try:
    from tqdm import tqdm
except ImportError:
    sys.exit("tqdm not found. Run: pip install tqdm")

try:
    import anthropic
except ImportError:
    sys.exit("anthropic not found. Run: pip install anthropic")

# openpyxl is optional — only needed when --meta-file is supplied
try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False


# ---------------------------------------------------------------------------
# Degree / title tokens to skip when extracting instructor last name
# ---------------------------------------------------------------------------

BAD_INSTRUCTOR_TOKENS = {
    "ph.d.", "phd", "ph.d", "jr.", "jr", "sr.", "sr", "professor", "prof",
    "dr.", "dr", "instructor", "lecturer", "adjunct", "specified", "not",
    "practice)", "practice", "ptp", "tbd", "staff", "faculty", "visiting",
    "emeritus", "associate", "assistant", "clinical",
}


# ---------------------------------------------------------------------------
# Metadata loading from MURP_Syllabi_Checklist.xlsx
# ---------------------------------------------------------------------------

def parse_instructor_campus_pairs(text: str) -> dict[str, str]:
    """
    Parse strings like "Schenk (Blacksburg); Misra (NCR)" or
    "Lyon-Hill & Tate (Blacksburg); Cowell (NCR)"
    → {'schenk': 'blacksburg', 'misra': 'arlington', 'lyonhill': 'blacksburg',
       'tate': 'blacksburg', 'cowell': 'arlington'}
    """
    result = {}
    segments = [s.strip() for s in str(text).split(';')]
    for seg in segments:
        m = re.search(r'\((Blacksburg|NCR|Arlington|Online)\)', seg, re.I)
        campus = 'ns'
        if m:
            raw_c = m.group(1).lower()
            if 'black' in raw_c:
                campus = 'blacksburg'
            elif raw_c in ('ncr', 'arlington'):
                campus = 'arlington'
            elif 'online' in raw_c:
                campus = 'online'
            name_part = seg[:m.start()].strip()
        else:
            name_part = seg.strip()

        # Split on & or , to handle multiple instructors sharing a campus
        names = re.split(r'[&,]', name_part)
        for name in names:
            name = name.strip()
            if not name:
                continue
            # Take last word of name, strip non-alpha
            last = re.sub(r'[^a-z]', '', name.split()[-1].lower())
            if last and last not in BAD_INSTRUCTOR_TOKENS:
                result[last] = campus
    return result


def load_meta(xlsx_path: str) -> dict:
    """
    Load MURP_Syllabi_Checklist.xlsx and return:
      instructor_campus : {last_name_lower → campus_slug}
      course_titles     : {code_normalized → full_title}
    """
    if not HAS_OPENPYXL:
        print("  Warning: openpyxl not installed — --meta-file ignored. "
              "Run: pip install openpyxl")
        return {'instructor_campus': {}, 'course_titles': {}}

    instructor_campus: dict[str, str] = {}
    course_titles: dict[str, str] = {}

    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    ws = wb.active

    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or row[0] is None:
            continue
        code = str(row[0]).strip()
        title = str(row[1]).strip() if len(row) > 1 and row[1] else ''
        instructors = str(row[2]).strip() if len(row) > 2 and row[2] else ''

        code_norm = re.sub(r'[^a-z0-9]', '', code.lower())
        if code_norm and title and title.lower() not in ('none', 'nan', 'dne'):
            course_titles[code_norm] = title

        if instructors and instructors.lower() not in ('none', 'nan', 'dne'):
            pairs = parse_instructor_campus_pairs(instructors)
            instructor_campus.update(pairs)

    wb.close()
    print(f"  Meta loaded: {len(course_titles)} course titles, "
          f"{len(instructor_campus)} instructor-campus pairs")
    return {'instructor_campus': instructor_campus, 'course_titles': course_titles}


# ---------------------------------------------------------------------------
# Folder name parsing — strip instructor list from parentheses
# ---------------------------------------------------------------------------

def clean_course_slug(folder_name: str) -> str:
    """
    'UAP5174 Planning Theory and History (Bieri, Cowell, Misra)'
    → 'uap5174planningtheoryandhistory'
    Strip everything in parentheses (instructor names), then clean.
    """
    without_parens = re.sub(r'\([^)]*\)', '', folder_name)
    return re.sub(r'[^a-z0-9]', '', without_parens.lower())


def get_folder_instructors(folder_name: str) -> list[str]:
    """
    'UAP5174 Planning Theory and History (Bieri, Cowell, Misra)'
    → ['bieri', 'cowell', 'misra']
    """
    m = re.search(r'\(([^)]+)\)', folder_name)
    if not m:
        return []
    raw = m.group(1)
    names = [re.sub(r'[^a-z]', '', n.strip().lower()) for n in re.split(r'[,&]', raw)]
    return [n for n in names if n and n not in BAD_INSTRUCTOR_TOKENS]


def get_course_code(folder_name: str) -> str:
    """
    Extract just the course code: 'UAP5174 Planning Theory...' → 'uap5174'
    """
    m = re.match(r'([A-Za-z]+[-\s]?\d+[A-Za-z]*)', folder_name.strip())
    if m:
        return re.sub(r'[^a-z0-9]', '', m.group(1).lower())
    return re.sub(r'[^a-z0-9]', '', folder_name.lower())[:10]


# ---------------------------------------------------------------------------
# Filename helpers
# ---------------------------------------------------------------------------

def clean_instructor_last(raw: str) -> str:
    """
    Extract last name, skipping degree/title tokens.
    'Sheryl D. Bailey, Ph.D.' → 'bailey'
    'Professor Smith' → 'smith'
    """
    # Remove content in parentheses (e.g. emails)
    raw = re.sub(r'\([^)]*\)', '', raw).strip()
    tokens = raw.replace(',', ' ').split()
    clean_tokens = [
        re.sub(r'[^a-z]', '', t.lower())
        for t in tokens
        if re.sub(r'[^a-z.]', '', t.lower()) not in BAD_INSTRUCTOR_TOKENS
    ]
    clean_tokens = [t for t in clean_tokens if t]
    return clean_tokens[-1] if clean_tokens else ''


def clean_term_slug(raw: str) -> str:
    """
    'Spring 2026' → 's26', 'Fall 2024' → 'f24', 'Not specified' → ''
    """
    t = raw.strip().lower()
    if not t or 'not' in t or 'specified' in t or t == 'nan':
        return ''
    t = re.sub(r'spring\s+\d{2}(\d{2})', r's\1', t)
    t = re.sub(r'fall\s+\d{2}(\d{2})', r'f\1', t)
    t = re.sub(r'summer\s+(?:ii?\s+)?\d{2}(\d{2})', r'su\1', t)
    t = re.sub(r'[^a-z0-9]', '', t)
    # If regex didn't simplify (still long), it's unrecognised — drop it
    return t if len(t) <= 5 else ''


# ---------------------------------------------------------------------------
# Extraction prompts
# ---------------------------------------------------------------------------

SYLLABUS_PROMPT = """You are converting a course syllabus into a structured markdown knowledge-base file for Jane, an AI advising assistant for the MURP (Master of Urban and Regional Planning) program at Virginia Tech SPIA.

Context clues to help you extract accurately:
- Folder name (course identifier): {COURSE_FOLDER}
- PDF filename: {PDF_FILENAME}
- Known course title: {KNOWN_TITLE}
- Known campus for listed instructors: {CAMPUS_HINT}

Use the known course title if the syllabus states a different or abbreviated title.
Use the campus hint to set the Campus field if the syllabus does not state campus explicitly.
Virginia Tech's NCR and Arlington campuses are the same location — label both as Arlington/NCR.

Blacksburg location clues: "4040 Prices Fork", "Squires", "main campus", "BKS"
Arlington/NCR location clues: "Pentagon City", "Ballston", "900 N Glebe", "Northern Virginia", "NOVA"

Extract and format exactly as shown. Write "Not specified" only as a true last resort.
Do not invent information.

---
# {COURSE CODE}: {COURSE TITLE}
**Instructor:** {Full name}
**Term:** {e.g. Spring 2026}
**Campus:** {Blacksburg | Arlington/NCR | Online | Not specified}
**Campus Note:** {Note any policies that differ from the other campus offering, if known. Otherwise write "N/A."}
**Modality:** {In-Person | Hybrid | Online-Synchronous | Online-Asynchronous | Not specified}
**Modality Note:** {For Hybrid/Online: describe synchronous vs asynchronous requirements and technology needed. For In-Person: "Standard in-person delivery."}
**Credits:** {number}
**CRN:** {if present, else omit this line}

## Course Description
{1–3 sentence description from the syllabus}

## Learning Objectives
{Bullet list of stated learning objectives, or 3–5 implied goals if not listed}

## Required Texts and Materials
{List of required texts, software, materials. "None specified" if absent.}

## Grading
{Each graded component with percentage or point weight. Bullet points.}

## Key Policies

**Attendance:**
{Attendance policy, verbatim or closely paraphrased}

**Late Work:**
{Late work / missed deadline policy, verbatim or closely paraphrased}

**AI / Generative AI Use:**
{AI use policy if stated; otherwise "Not specified — confirm with instructor."}

**Academic Integrity:**
{Academic integrity policy if stated; otherwise "Standard VT Honor Code applies."}

## Course Topics and Schedule
{Major topic blocks across the semester. 6–10 thematic bullets. Do not list every week.}

## Office Hours and Contact
{Instructor office hours, location, and contact email if stated}

## Advising Notes
{2–4 sentences for a MURP advising bot: what type of student this course suits, how it fits the MURP curriculum, prerequisites or sequencing notes, campus-specific considerations, distinctive features. Third person.}
---

Now extract from this syllabus:

{DOCUMENT_TEXT}"""


THESIS_PROMPT = """You are converting a MURP thesis into a structured markdown knowledge-base file for Jane, an AI advising assistant at Virginia Tech SPIA.

Jane uses this to help students understand past research topics, methods, and how theses connect to MURP coursework.

Extract and format exactly as shown. Summarise — do not reproduce verbatim passages.

---
# Thesis: {TITLE}
**Author:** {Full name}
**Year:** {Year}
**Degree:** {MURP — Plan A | MURP — Plan B | Not specified}
**Advisor:** {Faculty advisor name if stated}
**Committee:** {Other committee members if stated}

## Research Question and Problem Statement
{1–3 sentences stating the central research question}

## Planning Domain
{Primary domain(s): Housing Policy, Transportation, Environmental Planning, Community Development, Land Use, Economic Development, Urban Design, International Development, etc.}

## Geographic Focus
{Study area or case study location}

## Research Methods
{Bullet list of specific methods: GIS spatial analysis, semi-structured interviews, survey design, regression analysis, case study comparison, document analysis, participatory mapping, etc.}

## Key Findings
{3–6 bullet points summarising main findings}

## Policy Implications and Recommendations
{2–4 bullet points on practical recommendations}

## Connections to MURP Curriculum
{3–6 connections to specific MURP courses with brief notes. Example: "UAP 5554 (Land Use Law) — zoning analysis framework used in Chapter 3"}

## Keywords and Themes
{8–12 keywords capturing the thesis content}

## Advising Notes
{3–5 sentences: what kind of student this suits as a model, methods a student would need to learn, how it fits the Plan A pathway, notable research design features. Third person.}
---

Now extract from this thesis:

{DOCUMENT_TEXT}"""


RUBRIC_PROMPT = """You are converting a MURP thesis or final project grading rubric into a structured markdown knowledge-base file for Jane, an AI advising assistant at Virginia Tech SPIA.

Jane uses this to help students understand evaluation criteria and what distinguishes strong from weak work.

---
# MURP Thesis and Final Project Evaluation Rubric

## Document Overview
{1–2 sentences describing what this rubric covers}

## Evaluation Dimensions
{For each graded dimension, create a subsection:}

### {Dimension Name}
**Weight:** {percentage or points if stated}
**What is assessed:** {1–2 sentences}
**Excellent / Full marks:** {what earns the highest score}
**Adequate / Passing:** {what earns a passing score}
**Inadequate / Failing:** {what falls below passing}

## Overall Standards
{Any overarching standards or grade thresholds}

## Key Advice for Students
{5–8 actionable bullet points a student could take from this rubric to produce strong work}

## Advising Notes
{3–4 sentences Jane should know when a student asks what makes a good thesis or how their project will be graded. Third person.}
---

Now extract from this rubric:

{DOCUMENT_TEXT}"""


# ---------------------------------------------------------------------------
# PDF text extraction
# ---------------------------------------------------------------------------

def extract_text(pdf_path: Path, max_chars: int = 40000) -> str:
    try:
        doc = fitz.open(str(pdf_path))
        pages = [page.get_text("text") for page in doc]
        doc.close()
        text = "\n".join(pages).strip()
        if len(text) > max_chars:
            text = text[:max_chars] + "\n\n[Truncated]"
        return text
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Filename derivation
# ---------------------------------------------------------------------------

def derive_syllabus_filename(pdf_path: Path, markdown_text: str,
                              meta: dict) -> str:
    """
    {course_slug}_{campus}_{modality_if_nondefault}_{instructor}_{term}.md
    Course slug: folder name with parenthetical instructor list stripped.
    Campus: from Claude extraction → meta lookup → PDF filename fallback.
    """
    folder_name  = pdf_path.parent.name
    course_slug  = clean_course_slug(folder_name)
    folder_insts = get_folder_instructors(folder_name)
    course_code  = get_course_code(folder_name)

    # --- Campus ---
    campus_m = re.search(r'\*\*Campus:\*\*\s+(.+)', markdown_text)
    campus_slug = 'ns'
    if campus_m:
        raw = campus_m.group(1).strip().lower()
        if any(x in raw for x in ['blacksburg', 'bks', 'main campus', 'prices fork']):
            campus_slug = 'blacksburg'
        elif any(x in raw for x in ['arlington', 'ncr', 'national capital',
                                     'nova', 'pentagon', 'ballston', 'glebe',
                                     'northern virginia']):
            campus_slug = 'arlington'
        elif 'online' in raw:
            campus_slug = 'online'

    # Meta lookup: use extracted or folder instructor names
    if campus_slug == 'ns' and meta.get('instructor_campus'):
        ic = meta['instructor_campus']
        # Try instructor extracted by Claude first
        inst_m = re.search(r'\*\*Instructor:\*\*\s+(.+)', markdown_text)
        candidates = []
        if inst_m:
            last = clean_instructor_last(inst_m.group(1))
            if last:
                candidates.append(last)
        candidates.extend(folder_insts)
        for c in candidates:
            if c in ic:
                campus_slug = ic[c]
                break

    # PDF filename fallback
    if campus_slug == 'ns':
        fn = pdf_path.name.lower()
        if any(x in fn for x in ['blacksburg', 'bburg', 'bks']):
            campus_slug = 'blacksburg'
        elif any(x in fn for x in ['arlington', 'ncr', 'nova', 'national']):
            campus_slug = 'arlington'

    # --- Modality ---
    modality_m = re.search(r'\*\*Modality:\*\*\s+(.+)', markdown_text)
    modality_slug = None
    if modality_m:
        raw_m = modality_m.group(1).strip().lower()
        if any(x in raw_m for x in ['hybrid', 'hyflex', 'blended']):
            modality_slug = 'hybrid'
        elif any(x in raw_m for x in ['online', 'asynchronous', 'synchronous']):
            modality_slug = 'online'

    # --- Instructor ---
    instructor_slug = ''
    inst_m = re.search(r'\*\*Instructor:\*\*\s+(.+)', markdown_text)
    if inst_m:
        instructor_slug = clean_instructor_last(inst_m.group(1))

    # --- Term ---
    term_slug = ''
    term_m = re.search(r'\*\*Term:\*\*\s+(.+)', markdown_text)
    if term_m:
        term_slug = clean_term_slug(term_m.group(1))

    # --- Assemble ---
    parts = [course_slug, campus_slug]
    if modality_slug:
        parts.append(modality_slug)
    if instructor_slug:
        parts.append(instructor_slug)
    if term_slug:
        parts.append(term_slug)

    return '_'.join(parts) + '.md'


def derive_thesis_filename(pdf_path: Path, markdown_text: str) -> str:
    author = re.search(r'\*\*Author:\*\*\s+(.+)', markdown_text)
    year   = re.search(r'\*\*Year:\*\*\s+(\d{4})', markdown_text)
    parts  = ['thesis']
    if author:
        last = clean_instructor_last(author.group(1))
        if last:
            parts.append(last)
    if year:
        parts.append(year.group(1))
    if len(parts) == 1:
        return 'thesis_' + re.sub(r'[^a-z0-9]', '_', pdf_path.stem.lower()) + '.md'
    return '_'.join(parts) + '.md'


def derive_rubric_filename(pdf_path: Path) -> str:
    stem = re.sub(r'[^a-z0-9_]', '_', pdf_path.stem.lower()).strip('_')
    return f'murp_rubric_{stem}.md'


# ---------------------------------------------------------------------------
# Claude API
# ---------------------------------------------------------------------------

def call_claude(client: anthropic.Anthropic, prompt: str) -> str:
    message = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=2000,
        messages=[{'role': 'user', 'content': prompt}],
    )
    return message.content[0].text.strip()


# ---------------------------------------------------------------------------
# Build work queue
# ---------------------------------------------------------------------------

def build_queue(args) -> list[dict]:
    in_root = Path(args.folder)
    queue   = []

    if args.prefix:
        prefixes = tuple(p.upper() for p in args.prefix)
        for pdf in sorted(in_root.rglob('*.pdf')):
            if pdf.parent.name.upper().startswith(prefixes):
                queue.append({'path': pdf, 'type': 'syllabus'})

    if args.thesis_folder:
        thesis_dir = in_root / args.thesis_folder
        if not thesis_dir.exists():
            matches = [d for d in in_root.iterdir()
                       if d.is_dir() and d.name.lower() == args.thesis_folder.lower()]
            thesis_dir = matches[0] if matches else None

        if thesis_dir and thesis_dir.exists():
            for pdf in sorted(thesis_dir.rglob('*.pdf')):
                doc_type = 'rubric' if 'rubric' in pdf.stem.lower() else 'thesis'
                queue.append({'path': pdf, 'type': doc_type})
        else:
            print(f"  Warning: thesis folder '{args.thesis_folder}' not found")

    return queue


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Convert syllabi and MURP theses to Jane knowledge-base markdown.')
    parser.add_argument('--folder',       required=True)
    parser.add_argument('--out',          required=True)
    parser.add_argument('--prefix',       default=None, nargs='+')
    parser.add_argument('--thesis-folder',default=None)
    parser.add_argument('--meta-file',    default=None,
                        help='Path to MURP_Syllabi_Checklist.xlsx for campus/title metadata')
    parser.add_argument('--dry-run',      action='store_true')
    parser.add_argument('--reprocess',    action='store_true')
    parser.add_argument('--delay',        type=float, default=1.5)
    parser.add_argument('--log',          default='kb_results.csv')
    args = parser.parse_args()

    if not args.prefix and not args.thesis_folder:
        sys.exit('Provide at least one of --prefix or --thesis-folder.')

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key and not args.dry_run:
        sys.exit('ANTHROPIC_API_KEY not set.\n'
                 'Windows: setx ANTHROPIC_API_KEY "sk-ant-..."\n'
                 'Open a new PowerShell window after setx.')

    # Load metadata
    meta = {'instructor_campus': {}, 'course_titles': {}}
    if args.meta_file:
        meta = load_meta(args.meta_file)

    out_root = Path(args.out)
    out_root.mkdir(parents=True, exist_ok=True)

    queue = build_queue(args)
    if not queue:
        sys.exit('No matching PDF files found.')

    # Skip already-processed using CSV log
    processed_sources: set[str] = set()
    log_path = Path(args.log)
    if log_path.exists() and not args.reprocess:
        try:
            with log_path.open(encoding='utf-8') as f:
                for row in csv.DictReader(f):
                    if row.get('status') == 'success':
                        processed_sources.add(row['source'])
        except Exception:
            pass

    if not args.reprocess:
        original = len(queue)
        queue    = [i for i in queue if str(i['path']) not in processed_sources]
        skipped  = original - len(queue)
    else:
        skipped = 0

    syllabi_count = sum(1 for i in queue if i['type'] == 'syllabus')
    thesis_count  = sum(1 for i in queue if i['type'] == 'thesis')
    rubric_count  = sum(1 for i in queue if i['type'] == 'rubric')

    print(f'\n  Syllabi to process  : {syllabi_count:,}')
    print(f'  Theses to process   : {thesis_count:,}')
    print(f'  Rubrics to process  : {rubric_count:,}')
    print(f'  Already converted   : {skipped:,}')
    print(f'  Output folder       : {out_root.resolve()}')

    if args.dry_run:
        print('\n  DRY RUN — no API calls, no files written.\n')
        tags = {'syllabus': '[syllabus]', 'thesis': '[thesis]  ', 'rubric': '[rubric]  '}
        for item in queue:
            tag = tags.get(item['type'], '[unknown] ')
            print(f'    {tag}  {item["path"].parent.name} / {item["path"].name}')
        return

    client  = anthropic.Anthropic(api_key=api_key)
    results = []
    counts  = {'success': 0, 'skipped_empty': 0, 'failed': 0}

    for item in tqdm(queue, unit='file', dynamic_ncols=True):
        pdf_path: Path = item['path']
        doc_type: str  = item['type']
        status, message, out_path = 'failed', '', ''

        try:
            raw_text = extract_text(pdf_path)
            if not raw_text or len(raw_text) < 200:
                status  = 'skipped_empty'
                message = 'No extractable text — run ocr_batch.py first.'
                counts['skipped_empty'] += 1
            else:
                if doc_type == 'syllabus':
                    course_code  = get_course_code(pdf_path.parent.name)
                    known_title  = meta['course_titles'].get(course_code, 'Not in metadata')
                    # Build campus hint from meta for folder instructors
                    folder_insts = get_folder_instructors(pdf_path.parent.name)
                    campus_hints = []
                    for inst in folder_insts:
                        campus = meta['instructor_campus'].get(inst)
                        if campus:
                            campus_hints.append(f'{inst.title()} → {campus}')
                    campus_hint = '; '.join(campus_hints) if campus_hints else 'Unknown'

                    prompt = (SYLLABUS_PROMPT
                              .replace('{COURSE_FOLDER}', pdf_path.parent.name)
                              .replace('{PDF_FILENAME}',  pdf_path.name)
                              .replace('{KNOWN_TITLE}',   known_title)
                              .replace('{CAMPUS_HINT}',   campus_hint)
                              .replace('{DOCUMENT_TEXT}', raw_text))
                    markdown = call_claude(client, prompt)
                    filename = derive_syllabus_filename(pdf_path, markdown, meta)

                elif doc_type == 'rubric':
                    prompt   = RUBRIC_PROMPT.replace('{DOCUMENT_TEXT}', raw_text)
                    markdown = call_claude(client, prompt)
                    filename = derive_rubric_filename(pdf_path)

                else:  # thesis
                    prompt   = THESIS_PROMPT.replace('{DOCUMENT_TEXT}', raw_text)
                    markdown = call_claude(client, prompt)
                    filename = derive_thesis_filename(pdf_path, markdown)

                # Collision guard — append PDF stem if filename already exists
                out_file = out_root / filename
                if out_file.exists() and not args.reprocess:
                    suffix   = re.sub(r'[^a-z0-9]', '', pdf_path.stem.lower())[:8]
                    filename = filename.replace('.md', f'_{suffix}.md')
                    out_file = out_root / filename

                out_path = str(out_file)
                Path(out_path).write_text(markdown, encoding='utf-8')
                status  = 'success'
                message = f'→ {filename}'
                counts['success'] += 1
                time.sleep(args.delay)

        except Exception as e:
            status  = 'failed'
            message = str(e)
            counts['failed'] += 1

        results.append({
            'source':  str(pdf_path),
            'type':    doc_type,
            'output':  out_path,
            'status':  status,
            'message': message,
        })

    # Append to existing log rather than overwriting — preserves history across runs
    write_header = not log_path.exists() or args.reprocess
    with log_path.open('a' if not write_header else 'w',
                       newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(
            f, fieldnames=['source', 'type', 'output', 'status', 'message'])
        if write_header:
            writer.writeheader()
        writer.writerows(results)

    print(f"\n{'='*60}")
    print(f'  Done.')
    print(f'  Converted successfully : {counts["success"]:,}')
    print(f'  Skipped (no text)      : {counts["skipped_empty"]:,}')
    print(f'  Failed                 : {counts["failed"]:,}')
    print(f'\n  Output .md files → {out_root.resolve()}')
    print(f'  Log               → {log_path.resolve()}')
    if counts['skipped_empty'] > 0:
        print('\n  Tip: run ocr_batch.py on skipped files, then re-run with --reprocess')
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
