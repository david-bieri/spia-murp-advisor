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
 * File loading strategy — four tiers based on topic and query intent:
 *
 * BASE (always loaded except admin shortcut):
 *   murp_*.md (excluding murp_timetable_*)  — program-level knowledge
 *   spia_staff_contacts.md
 *   jacobs_concepts.md
 *   planning_pearls.md
 *
 * TIMETABLE (semester-specific, loaded on demand):
 *   murp_timetable_*.md  — live schedule from Banner scraper
 *   NOT included in base — loaded only when scheduling intent detected
 *   or when topic is core / electives / certificates
 *
 * COURSES (loaded for core / electives / certificates topics):
 *   uap5*.md, gia5*.md, spia5*.md — course syllabi from pipeline
 *   thesis_*.md                   — MURP thesis KB
 *
 * ADMIN shortcut (topic === "admin"):
 *   Only spia_staff_contacts.md + murp_faqs.md
 *
 * Token estimates (approximate):
 *   admin                              :  ~5K
 *   schedule intent, no course number  :  ~38K (base + timetable)
 *   program, no course number          :  ~30K (base + theses)
 *   core / electives / certificates    :  ~103K (base + courses + theses + timetable)
 *   any topic, specific course number  :  ~43K (base + matching course + theses + timetable)
 *
 * QUERY-AWARE OVERRIDES (evaluated before topic):
 *   1. Specific course number (e.g. "UAP 5174") — loads only that course's files
 *      + base + theses + timetable. Keeps context lean, prevents Vercel timeouts.
 *   2. Scheduling intent keywords — loads base + timetable only (no syllabi needed
 *      for "is UAP 5174 offered this fall?" type queries).
 *
 * NOTE: murp_timetable_*.md is intentionally excluded from isBase() to avoid
 * loading ~8K tokens of schedule data on every query. It is opt-in only.
 */

// Matches UAP 5174, GIA5034, SPIA 5024, uap5174, etc.
const COURSE_NUMBER_RE = /\b(UAP|GIA|SPIA)\s*(\d{4})/i;

// Scheduling / availability intent — triggers timetable load
const SCHEDULE_RE =
  /\b(offered|available|this (fall|spring|summer|semester|term)|what.s on|timetable|schedule|section|when is|when does|crn|meeting time|time slot|what time|days does|in the (fall|spring))\b/i;

function isTimetable(f: string): boolean {
  return f.startsWith("murp_timetable_");
}

function isBase(f: string): boolean {
  return (
    // murp_*.md but NOT the timetable — that's semester-specific and loaded on demand
    (f.startsWith("murp_") && !isTimetable(f)) ||
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

  const courseMatch = query.match(COURSE_NUMBER_RE);
  const isScheduleQuery = SCHEDULE_RE.test(query);

  let filesToLoad: string[];

  if (courseMatch) {
    // Specific course mentioned — load only that course's files + base + theses + timetable.
    // Timetable included so Jane can answer "when does UAP 5174 meet this semester?"
    // alongside syllabus content.
    const coursePrefix =
      courseMatch[1].toLowerCase() + courseMatch[2].toLowerCase();
    filesToLoad = allFiles.filter(
      (f) =>
        isBase(f) ||
        isThesis(f) ||
        isTimetable(f) ||
        f.startsWith(coursePrefix),
    );
  } else if (topic === "admin") {
    // Admin shortcut — contacts and FAQs only, nothing else needed
    filesToLoad = allFiles.filter(
      (f) => f === "spia_staff_contacts.md" || f === "murp_faqs.md",
    );
  } else if (isScheduleQuery && topic !== "core" && topic !== "electives" && topic !== "certificates") {
    // Scheduling intent without a broad course topic — load base + timetable only.
    // No syllabi needed for availability / timing queries; keeps tokens low.
    filesToLoad = allFiles.filter((f) => isBase(f) || isTimetable(f));
  } else if (
    topic === "core" ||
    topic === "electives" ||
    topic === "certificates"
  ) {
    // Broad course topic — full course KB + timetable so Jane can answer both
    // "what is covered in UAP 5174?" and "when is it offered?" in one response.
    filesToLoad = allFiles.filter(
      (f) => isBase(f) || isCourse(f) || isThesis(f) || isTimetable(f),
    );
  } else {
    // "program" topic and default — base + theses, no syllabi or timetable
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
