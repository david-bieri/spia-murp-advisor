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
 *   admin   :  ~5K  (contacts + FAQs only)
 *   program :  ~30K (base set + theses)
 *   core / electives / certificates : ~95K (base + all courses + theses)
 */

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
  void query;

  const allFiles = (await readdir(CONTENT_DIR))
    .filter((f) => f.endsWith(".md"))
    .sort();

  let filesToLoad: string[];

  if (topic === "admin") {
    filesToLoad = allFiles.filter(
      (f) => f === "spia_staff_contacts.md" || f === "murp_faqs.md",
    );
  } else if (
    topic === "core" ||
    topic === "electives" ||
    topic === "certificates"
  ) {
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
