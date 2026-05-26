// src/components/StarterPrompts.tsx
// Phase 3 revision: adds new chips for degree map, audit, funding, thesis brainstorm
// Preserves all existing chips from Phase 2 (7 chips → 10 chips)
// Chips disappear when messages.length > 1 (opening message = length 1)

interface Props {
  onSelect: (prompt: string) => void;
  visible?: boolean; // optional — defaults to true for backward compatibility with existing ChatWindow
}

// Existing 7 chips (preserved exactly) + 3 new Phase 3 chips
const CHIPS = [
  // Existing chips — do not reorder or rename
  { label: "Course sequence",         prompt: "What's the recommended two-year course sequence for the MURP program?" },
  { label: "Certificate options",     prompt: "What certificate options are available in MURP and what courses do they require?" },
  { label: "Find a thesis advisor",   prompt: "How do I find a thesis advisor? What faculty work on environmental or transportation planning?" },
  { label: "Thesis methods",          prompt: "What research methods do MURP students typically use for their theses?" },
  { label: "Assistantships",          prompt: "How do I apply for a graduate assistantship (GA/GTA/GRA)?" },
  { label: "Dual degree options",     prompt: "What dual degree options are available for MURP students?" },
  { label: "Arlington vs Blacksburg", prompt: "What are the differences between the Arlington and Blacksburg campuses for MURP?" },

  // New Phase 3 chips
  { label: "Build my degree plan",    prompt: "I'd like to build a personalised two-year degree plan. Can you help me?" },
  { label: "Audit my progress",       prompt: "I want to audit my progress toward the MURP degree. Here are the courses I've completed so far:" },
  { label: "Funding opportunities",   prompt: "What funding, fellowships, and scholarship opportunities are available for MURP students?" },
];

export function StarterPrompts({ onSelect, visible = true }: Props) {
  if (!visible) return null;

  return (
    <div className="starter-prompts">
      {CHIPS.map((chip) => (
        <button
          key={chip.label}
          className="starter-chip rounded-full"
          onClick={() => onSelect(chip.prompt)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
