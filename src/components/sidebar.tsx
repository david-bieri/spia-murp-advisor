"use client";

export type Campus = "blacksburg" | "arlington" | null;
export type Topic = "program" | "uap5174" | "admin";

interface SidebarProps {
  campus: Campus;
  setCampus: (c: Campus) => void;
  topic: Topic;
  setTopic: (t: Topic) => void;
  onQuickQuestion: (text: string) => void;
}

const QUICK_QUESTIONS: Record<Topic, string[]> = {
  program: [
    "What are the six MURP core courses?",
    "What's the difference between the capstone and the thesis?",
    "What dual degrees are available with the MURP?",
    "Which graduate certificates pair with the MURP?",
  ],
  uap5174: [
    "How is the final grade calculated?",
    "What's the reflection policy?",
    "What's the late assignment policy?",
    "Is there an AI use policy?",
  ],
  admin: [
    "Who do I contact about admissions?",
    "Who handles graduate assistantships?",
    "How do I get reimbursed for travel?",
    "Who's the Arlington campus contact?",
  ],
};

const TOPIC_LABELS: Record<Topic, string> = {
  program: "Program",
  uap5174: "UAP 5174",
  admin: "Admin",
};

export default function Sidebar({
  campus,
  setCampus,
  topic,
  setTopic,
  onQuickQuestion,
}: SidebarProps) {
  return (
    <aside
      className="flex w-full md:w-80 md:flex-none flex-col text-white"
      style={{ backgroundColor: "#861F41" }}
    >
      <div className="px-6 pt-6 pb-4 border-b border-white/15">
        <h1 className="font-serif text-2xl leading-tight">
          SPIA MURP Advisor
        </h1>
        <p className="mt-1 text-xs text-white/75">
          Virginia Tech · School of Public and International Affairs
        </p>
      </div>

      <div className="px-6 pt-5">
        <p className="text-xs uppercase tracking-wide text-white/70 mb-2">
          Campus
        </p>
        <div className="flex gap-2">
          {(["blacksburg", "arlington"] as const).map((c) => {
            const active = campus === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCampus(active ? null : c)}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-white text-[#861F41]"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {c === "blacksburg" ? "Blacksburg" : "Arlington"}
              </button>
            );
          })}
        </div>
        {campus === null && (
          <p className="mt-2 text-[11px] text-white/60 leading-snug">
            UAP 5174 policies differ between campuses — select one for
            course-specific answers.
          </p>
        )}
      </div>

      <div className="px-6 pt-5">
        <p className="text-xs uppercase tracking-wide text-white/70 mb-2">
          Topic
        </p>
        <div className="flex rounded-lg overflow-hidden bg-white/10">
          {(Object.keys(TOPIC_LABELS) as Topic[]).map((t) => {
            const active = topic === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-[#E5751F] text-white"
                    : "text-white/85 hover:bg-white/10"
                }`}
              >
                {TOPIC_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 pt-5 pb-6 flex-1 overflow-y-auto">
        <p className="text-xs uppercase tracking-wide text-white/70 mb-2">
          Try asking
        </p>
        <ul className="flex flex-col gap-2">
          {QUICK_QUESTIONS[topic].map((q) => (
            <li key={q}>
              <button
                type="button"
                onClick={() => onQuickQuestion(q)}
                className="w-full text-left rounded-md bg-white/5 hover:bg-white/15 transition px-3 py-2 text-sm leading-snug"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-6 py-4 border-t border-white/15 text-[11px] text-white/65 leading-relaxed">
        <p>
          Built and maintained by{" "}
          <a
            href="mailto:bieri@vt.edu"
            className="underline decoration-white/40 hover:decoration-white"
          >
            David Bieri
          </a>
          , Urban Affairs &amp; Planning.
        </p>
        <p className="mt-2">
          Informational only. For official decisions, confirm with your advisor.
        </p>
      </div>
    </aside>
  );
}