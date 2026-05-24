import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

// Module-level cache — persists across requests on warm serverless instances.
// Cold start reads from disk; subsequent requests return from memory.
let cachedFileList: string[] | null = null;
const fileContentCache = new Map<string, string>();

async function getFileList(): Promise<string[]> {
  if (cachedFileList) return cachedFileList;
  cachedFileList = (await readdir(CONTENT_DIR))
    .filter((f) => f.endsWith(".md"))
    .sort();
  return cachedFileList;
}

async function readFileCached(name: string): Promise<string> {
  if (fileContentCache.has(name)) return fileContentCache.get(name)!;
  const content = await readFile(path.join(CONTENT_DIR, name), "utf8");
  fileContentCache.set(name, content);
  return content;
}

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
 *   admin                              :  ~5K  (contacts + FAQs only)
 *   program, no course number          :  ~30K (base + theses)
 *   core / electives / certificates    :  ~95K (base + all courses + theses)
 *   any topic, specific course number  :  ~35K (base + matching course files + theses)
 *
 * QUERY-AWARE OVERRIDE:
 *   If the query mentions a specific course number (e.g. "UAP 5174"), only the
 *   files for that course are loaded alongside the base set — not the full 77-file
 *   course KB. This keeps context lean and prevents Vercel function timeouts while
 *   still giving Jane the right syllabus content. The topic tab is still respected
 *   for broad queries where no course number is present.
 */

// Matches UAP 5174, GIA5034, SPIA 5024, uap5174, etc.
const COURSE_NUMBER_RE = /\b(UAP|GIA|SPIA)\s*(\d{4})/i;

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
  const allFiles = await getFileList();

  // Check if the query mentions a specific course number
  const courseMatch = query.match(COURSE_NUMBER_RE);

  let filesToLoad: string[];

  if (courseMatch) {
    // Specific course mentioned — load only that course's files + base + theses
    // e.g. "UAP 5174" → prefix "uap5174"
    const coursePrefix =
      courseMatch[1].toLowerCase() + courseMatch[2].toLowerCase();
    filesToLoad = allFiles.filter(
      (f) => isBase(f) || isThesis(f) || f.startsWith(coursePrefix),
    );
  } else if (topic === "admin") {
    filesToLoad = allFiles.filter(
      (f) => f === "spia_staff_contacts.md" || f === "murp_faqs.md",
    );
  } else if (
    topic === "core" ||
    topic === "electives" ||
    topic === "certificates"
  ) {
    // Broad course topic — load full course KB
    filesToLoad = allFiles.filter(
      (f) => isBase(f) || isCourse(f) || isThesis(f),
    );
  } else {
    // "program" and default — base + theses, no syllabi
    filesToLoad = allFiles.filter((f) => isBase(f) || isThesis(f));
  }

  const contents = await Promise.all(
    filesToLoad.map((name) => readFileCached(name)),
  );

  const text = filesToLoad
    .map((name, i) => `--- ${name} ---\n${contents[i].trim()}`)
    .join("\n\n");

  return { text, sources: filesToLoad };
}
