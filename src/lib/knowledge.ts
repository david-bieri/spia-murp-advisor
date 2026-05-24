import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

/**
 * File loading strategy — two tiers based on active topic:
 *
 * BASE (always loaded):
 *   murp_*.md          — program-level knowledge (curriculum, FAQs, sequence, etc.)
 *   spia_staff_contacts.md
 *   jacobs_concepts.md
 *   planning_pearls.md
 *
 * COURSES (loaded for core / electives / certificates topics):
 *   uap5*.md, gia5*.md, spia5*.md — course syllabi from pipeline
 *   thesis_*.md                   — MURP thesis KB
 *
 * ADMIN shortcut (topic === "admin"):
 *   Only spia_staff_contacts.md + murp_faqs.md — nothing else needed
 *
 * Token estimates (approximate):
 *   admin                            :  ~5K  (contacts + FAQs only)
 *   program (no course number)       :  ~30K (base set + theses)
 *   core / electives / certificates  :  ~95K (base + all courses + theses)
 *   any topic with course number     :  ~95K (query-aware override)
 *
 * QUERY-AWARE OVERRIDE:
 *   If the query explicitly mentions a course number (e.g. "UAP 5174"),
 *   course files are loaded regardless of the active topic tab. This means
 *   a student asking about UAP 5174 on the Program tab still gets the right
 *   answer — the tab is a hint for vague queries, not a gate for specific ones.
 */

// Matches UAP 5174, GIA5034, SPIA 5024, etc.
const COURSE_NUMBER_RE = /\b(UAP|GIA|SPIA)\s*\d{4}/i;

function isBase(f: string): boolean {
  return (
    f.startsWith("murp_") ||
    f === "spia_staff_contacts.md" ||
    f === "jacobs_concepts.md" ||
    f === "planning_pearls.md"
  );
}

function isCourse(f: string): boolean {
  return /^(uap5|gia5|spia5)/.test(f);
}

function isThesis(f: string): boolean {
  return f.startsWith("thesis_");
}

export async function getContext(
  query: string,
  topic?: string,
): Promise<{ text: string; sources: string[] }> {
  const allFiles = (await readdir(CONTENT_DIR))
    .filter((f) => f.endsWith(".md"))
    .sort();

  // Query mentions a specific course number → always load course files
  const queryCitesCourse = COURSE_NUMBER_RE.test(query);

  const needsCourseFiles =
    queryCitesCourse ||
    topic === "core" ||
    topic === "electives" ||
    topic === "certificates";

  let filesToLoad: string[];

  if (topic === "admin" && !queryCitesCourse) {
    filesToLoad = allFiles.filter(
      (f) => f === "spia_staff_contacts.md" || f === "murp_faqs.md",
    );
  } else if (needsCourseFiles) {
    filesToLoad = allFiles.filter(
      (f) => isBase(f) || isCourse(f) || isThesis(f),
    );
  } else {
    // "program" and default — base + theses, no syllabi
    filesToLoad = allFiles.filter((f) => isBase(f) || isThesis(f));
  }

  const contents = await Promise.all(
    filesToLoad.map((name) =>
      readFile(path.join(CONTENT_DIR, name), "utf8"),
    ),
  );

  const text = filesToLoad
    .map((name, i) => `--- ${name} ---\n${contents[i].trim()}`)
    .join("\n\n");

  return { text, sources: filesToLoad };
}
