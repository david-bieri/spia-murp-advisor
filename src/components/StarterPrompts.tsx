const STARTER_PROMPTS = [
  {
    label: "Course sequence",
    prompt: "Can you walk me through the two-year MURP course sequence?",
  },
  {
    label: "Certificate options",
    prompt:
      "What certificates can I complete alongside the MURP degree, and what are the requirements for each?",
  },
  {
    label: "Find a thesis advisor",
    prompt:
      "I'm interested in housing policy and community development — which MURP faculty work in those areas?",
  },
  {
    label: "Thesis methods",
    prompt:
      "What research methods have past MURP theses used for housing policy or community development research?",
  },
  {
    label: "Assistantships",
    prompt:
      "How do graduate assistantships work in the MURP program, and who should I contact?",
  },
  {
    label: "UAP 5174 policy",
    prompt:
      "What are the late work and attendance policies for UAP 5174? I need to know which campus first.",
  },
];

export function StarterPrompts({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-4 justify-center">
      {STARTER_PROMPTS.map(({ label, prompt }) => (
        <button
          key={label}
          onClick={() => onSelect(prompt)}
          aria-label={`Ask: ${prompt}`}
          className="px-4 py-2 rounded-full text-sm border transition-colors"
          style={{
            borderColor: "rgba(134, 31, 65, 0.25)",
            color: "#861F41",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(134, 31, 65, 0.06)";
            e.currentTarget.style.borderColor = "rgba(134, 31, 65, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(134, 31, 65, 0.25)";
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
