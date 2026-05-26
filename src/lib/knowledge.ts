// src/lib/knowledge.ts
// Phase 3 revision: adds topic param + intent-based loading
// CRITICAL: getContext() signature is the ADR-001/ADR-010 phase boundary.
// Return type { text: string; sources: string[] } must never change.
// topic? param is acceptable per ADR-017 ("Phase 3 passes topic as filter").

import { readdir, readFile } from "fs/promises";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

// ── Intent detection ──────────────────────────────────────────────────────────
// These override topic-based loading to pull in specific KB files.

const DEADLINE_RE   = /\b(deadline|due date|when is|when does|this month|registration open|submit by|calendar)\b/i;
const FUNDING_RE    = /\b(funding|fellowship|scholarship|assistantship|stipend|financial|GA|GTA|GRA|money|paid)\b/i;
const PATHS_RE      = /\b(what do students|career|alumni|after graduation|typically take|sample (plan|schedule|path)|students (like me|interested in))\b/i;
const PREREQ_RE     = /\b(conflict|prerequisite|prereq|can i take|same semester|schedule check|concurrent)\b/i;
const PLAN_RE       = /\b(build (me|my)|create (me|my)|degree plan|personalised plan|two.?year plan)\b/i;
const AUDIT_RE      = /\b(audit|progress|completed|i('ve| have) taken|what('s| is) left|remaining credits|how far along)\b/i;

// Specific course number in query — load that course's KB file(s)
export const COURSE_NUMBER_RE = /\b(UAP|GIA|SPIA)\s*(\d{4})/i;

// ── File-level caches ─────────────────────────────────────────────────────────

let cachedFileList: string[] | null = null;
const fileContentCache = new Map<string, string>();

async function getFileList(): Promise<string[]> {
  if (cachedFileList) return cachedFileList;
  const files = await readdir(CONTENT_DIR);
  cachedFileList = files.filter((f) => f.endsWith(".md"));
  return cachedFileList;
}

async function readFileCached(filename: string): Promise<string> {
  if (fileContentCache.has(filename)) return fileContentCache.get(filename)!;
  const content = await readFile(path.join(CONTENT_DIR, filename), "utf-8");
  fileContentCache.set(filename, content);
  return content;
}

// ── File sets by topic ────────────────────────────────────────────────────────

// Always-loaded baseline (staff routing is never excluded)
const STAFF_FILES = ["spia_staff_contacts.md"];

// Core program files — needed for most advising queries
const PROGRAM_BASE = [
  "murp_curriculum.md",
  "murp_course_sequence.md",
  "murp_faqs.md",
];

// Certificate-specific
const CERT_FILES = ["murp_certificates_detail.md"];

// Thesis and faculty research
const THESIS_FILES = ["murp_faculty_research.md"];
// thesis_*.md files are loaded dynamically from the file list below

// Supplementary Phase 3 files (new in Sprint 1)
const SUPPLEMENTARY = {
  deadlines:     "murp_deadlines.md",
  funding:       "murp_funding.md",
  sample_paths:  "murp_sample_paths.md",
  prerequisites: "murp_prerequisites.md",
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Primary interface — ADR-001/ADR-010 contract. Do not change return type.
 * @param query   The user's latest message
 * @param topic   Active sidebar tab (ADR-017: Phase 3 filter parameter)
 */
export async function getContext(
  query: string,
  topic?: string
): Promise<{ text: string; sources: string[] }> {
  const allFiles = await getFileList();

  // Resolve which thesis files exist dynamically
  const thesisFiles = allFiles.filter(
    (f) => f.startsWith("thesis_") || f.startsWith("murp_rubric_")
  );

  // Supplementary files that exist on disk (added in Phase 3 Sprint 1)
  const suppExists = (key: keyof typeof SUPPLEMENTARY) =>
    allFiles.includes(SUPPLEMENTARY[key]);

  // ── Build file list based on topic + intent ─────────────────────────────

  let filesToLoad: string[] = [...STAFF_FILES];
  const sources: string[] = [];

  // Intent overrides — these pull in specific files regardless of topic
  if (DEADLINE_RE.test(query) && suppExists("deadlines")) {
    filesToLoad.push(SUPPLEMENTARY.deadlines);
  }
  if (FUNDING_RE.test(query) && suppExists("funding")) {
    filesToLoad.push(SUPPLEMENTARY.funding);
  }
  if (PATHS_RE.test(query) && suppExists("sample_paths")) {
    filesToLoad.push(SUPPLEMENTARY.sample_paths);
    filesToLoad.push(...PROGRAM_BASE);
  }
  if ((PREREQ_RE.test(query) || PLAN_RE.test(query) || AUDIT_RE.test(query))
      && suppExists("prerequisites")) {
    filesToLoad.push(SUPPLEMENTARY.prerequisites);
  }

  // Topic-based loading
  switch (topic) {
    case "admin":
      // Staff contacts + FAQ only — minimal context
      filesToLoad.push("murp_faqs.md");
      break;

    case "core": {
      filesToLoad.push(...PROGRAM_BASE);
      // Add course-specific files matching the query
      const courseMatch = query.match(COURSE_NUMBER_RE);
      if (courseMatch) {
        const prefix = `${courseMatch[1].toLowerCase()}${courseMatch[2]}`;
        filesToLoad.push(...allFiles.filter((f) => f.includes(prefix)));
      }
      break;
    }

    case "electives":
      filesToLoad.push("murp_electives.md", ...PROGRAM_BASE);
      if (suppExists("prerequisites")) filesToLoad.push(SUPPLEMENTARY.prerequisites);
      break;

    case "certificates":
      filesToLoad.push(...CERT_FILES, ...PROGRAM_BASE);
      break;

    case "program":
    default: {
      // Broadest load — program base + thesis + certs
      filesToLoad.push(...PROGRAM_BASE, ...CERT_FILES, ...THESIS_FILES, ...thesisFiles);
      // Add course-specific files if query mentions a course number
      const courseMatch = query.match(COURSE_NUMBER_RE);
      if (courseMatch) {
        const prefix = `${courseMatch[1].toLowerCase()}${courseMatch[2]}`;
        filesToLoad.push(...allFiles.filter((f) => f.includes(prefix)));
      }
      // For plan/audit queries, load all core program knowledge
      if (PLAN_RE.test(query) || AUDIT_RE.test(query)) {
        filesToLoad.push(...CERT_FILES, "murp_course_sequence.md");
      }
      break;
    }
  }

  // Deduplicate
  const uniqueFiles = [...new Set(filesToLoad)];

  // Load and assemble
  const chunks = await Promise.all(
    uniqueFiles.map(async (f) => {
      if (!allFiles.includes(f)) return null;
      try {
        const content = await readFileCached(f);
        sources.push(f);
        return content;
      } catch {
        return null;
      }
    })
  );

  const text = chunks.filter(Boolean).join("\n\n---\n\n");
  return { text, sources };
}
