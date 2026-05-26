// src/components/MobileTabs.tsx
// Phase 3: tabbed semester view for mobile (<640px)
// One semester visible at a time; tabs snap left-to-right
// Rendered by DegreePlanCard when viewport < 640px

import React from 'react';
import type { AcademicPlan, Course } from '@/hooks/useAcademicAdvisor';

interface MobileTabsProps {
  plan: AcademicPlan;
  activeSemester: string;
  onSelectSemester: (sem: string) => void;
  profile: {
    campus: string;
    focus: string;
    certificate: string | null;
    track: 'thesis' | 'capstone';
  };
  planningPearl?: string;
  creditTotal: number;
  onSendPrompt: (text: string) => void;
}

// Shorten semester labels for narrow tabs
function shortLabel(label: string): string {
  return label
    .replace('Fall — year 1',   'Fall Y1')
    .replace('Spring — year 1', 'Spr Y1')
    .replace('Fall — year 2',   'Fall Y2')
    .replace('Spring — year 2', 'Spr Y2');
}

export function MobileTabs({
  plan,
  activeSemester,
  onSelectSemester,
  profile,
  planningPearl,
  creditTotal,
  onSendPrompt,
}: MobileTabsProps) {
  const semesterLabels = Object.keys(plan);
  const activeCourses: Course[] = plan[activeSemester] ?? [];
  const semCredits = activeCourses.reduce((s, c) => s + c.credits, 0);

  return (
    <div className="w-full border border-[var(--border)] rounded-[var(--r)] overflow-hidden bg-[var(--surface)]">

      {/* Header */}
      <div className="bg-[var(--maroon)] text-white px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-white/20 font-serif text-xs flex items-center justify-center flex-shrink-0">
            J
          </div>
          <span className="text-sm font-medium">MURP degree map</span>
        </div>
        <span className="font-mono text-[11px] opacity-70">
          {creditTotal} cr · {profile.track}
        </span>
      </div>

      {/* Semester tabs — horizontal scroll, no scrollbar */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto scrollbar-none">
        {semesterLabels.map(label => (
          <button
            key={label}
            onClick={() => onSelectSemester(label)}
            className={[
              'flex-shrink-0 px-3 py-2 font-mono text-[10px] uppercase tracking-wider border-b-2 transition-colors',
              label === activeSemester
                ? 'text-[var(--maroon)] border-[var(--maroon)]'
                : 'text-[var(--text-3)] border-transparent hover:text-[var(--text-2)]',
            ].join(' ')}
          >
            {shortLabel(label)}
          </button>
        ))}
      </div>

      {/* Active semester courses */}
      <div className="p-3 flex flex-col gap-2">
        {activeCourses.map((course: Course) => (
          <div
            key={course.code}
            className={`${course.category} rounded-[var(--r-sm)] px-3 py-2`}
          >
            <div className="font-mono text-[10px] font-bold mb-0.5">{course.code}</div>
            <div className="text-[12px] leading-snug">{course.name}</div>
            <div className="text-[11px] opacity-70 mt-0.5">{course.credits} cr</div>
          </div>
        ))}
        <div className="text-right font-mono text-[10px] text-[var(--text-3)] mt-1">
          {semCredits} credits this semester
        </div>
      </div>

      {/* Planning pearl */}
      {planningPearl && (
        <div className="mx-3 mb-3 px-3 py-2 border-l-2 border-[var(--maroon)] bg-[var(--maroon-light)] rounded-r-[var(--r-sm)]">
          <p className="font-mono text-[9px] text-[var(--maroon)] uppercase tracking-wider mb-1">
            Planning pearl
          </p>
          <p className="text-[11px] text-[var(--text-2)] leading-relaxed">{planningPearl}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap px-3 pb-3">
        <button
          className="text-[11px] px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--maroon)] hover:text-[var(--maroon)] transition-colors"
          onClick={() => onSendPrompt('I want to swap one of the electives in this plan')}
        >
          Swap a course ↗
        </button>
        <button
          className="text-[11px] px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--maroon)] hover:text-[var(--maroon)] transition-colors"
          onClick={() =>
            onSendPrompt(
              profile.track === 'thesis'
                ? 'What does this plan look like on the capstone track?'
                : 'What does this plan look like on the thesis track?'
            )
          }
        >
          Switch track ↗
        </button>
      </div>
    </div>
  );
}
