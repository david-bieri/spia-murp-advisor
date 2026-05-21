import { readFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

const FILES = [
  "spia_staff_contacts.md",
  "murp_curriculum.md",
  "murp_electives.md",
  "uap5174_bieri_s26.md",
  "uap5174_cowell_s24.md",
] as const;

export async function getContext(
  query: string,
): Promise<{ text: string; sources: string[] }> {
  void query;

  const contents = await Promise.all(
    FILES.map((name) => readFile(path.join(CONTENT_DIR, name), "utf8")),
  );

  const text = FILES.map(
    (name, i) => `--- ${name} ---\n${contents[i].trim()}`,
  ).join("\n\n");

  return { text, sources: [...FILES] };
}