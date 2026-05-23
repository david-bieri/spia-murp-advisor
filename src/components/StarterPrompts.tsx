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
    label: "Plan A vs Plan B",
    prompt:
      "What's the difference between the Plan A thesis and the Plan B professional project?",
  },
  {
    label: "Assistantships",
    prompt:
      "How do graduate assistantships work in the MURP program, and who should I contact?",
  },
  {
    label: "4+1 pathway",
    prompt:
      "I'm a current VT undergraduate. How does the 4+1 accelerated MURP pathway work?",
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
