// src/components/DesktopGrid.tsx
// Phase 3: 4-column semester grid for desktop (≥640px)
// Rendered by DegreePlanCard when viewport ≥ 640px
// NOT responsible for responsive switching — DegreePlanCard handles that

import React, { useState } from 'react';
import type { AcademicPlan, PlanningMetrics, Course } from '@/hooks/useAcademicAdvisor';

interface DesktopGridProps {
  plan: AcademicPlan;
  metrics: PlanningMetrics;
  profile: {
    campus: string;
    focus: string;
    certificate: string | null;
    track: 'thesis' | 'capstone';
  };
  planningPearl?: string;
  onSendPrompt: (text: string) => void;
}

export function DesktopGrid({
  plan,
  metrics,
  profile,
  planningPearl,
  onSendPrompt,
}: DesktopGridProps) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const semesterEntries = Object.entries(plan);

  return (
    <div className="w-full border border-[var(--border)] rounded-[var(--r)] overflow-hidden bg-[var(--surface)]">

      {/* ── Header ── */}
      <div className="bg-[var(--maroon)] text-white p-3 flex items-center gap-2.5 flex-wrap">
        <div className="w-7 h-7 rounded-full bg-white/20 font-serif text-sm flex items-center justify-center flex-shrink-0">
          J
        </div>
        <span className="text-sm font-medium">Your MURP degree map</span>
        <div className="flex gap-1.5 ml-auto flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 font-mono capitalize">
            {profile.campus}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 font-mono capitalize">
            {profile.focus}
          </span>
          {profile.certificate && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 font-mono">
              {profile.certificate}
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 font-mono">
            {profile.track === 'thesis' ? 'Thesis' : 'Capstone'}
          </span>
          {!metrics.isValid && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 font-mono">
              ⚠ {metrics.validationMessages[0]}
            </span>
          )}
        </div>
      </div>

      {/* ── Colour legend ── */}
      <div className="flex gap-4 px-3 py-2 border-b border-[var(--border)] flex-wrap">
        {[
          { cls: 'chip-core',     label: 'Core' },
          { cls: 'chip-elective', label: 'Elective' },
          { cls: 'chip-cert',     label: 'Certificate' },
          { cls: 'chip-thesis',   label: profile.track === 'thesis' ? 'Thesis' : 'Capstone' },
        ].map(({ cls, label }) => (
          <div key={cls} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-[3px] ${cls}`} />
            <span className="text-[11px] text-[var(--text-2)]">{label}</span>
          </div>
        ))}
      </div>

      {/* ── 4-column semester grid ──
          items-start: columns don't stretch to match tallest — prevents layout break
          when one semester has more courses than others                              */}
      <div className="grid grid-cols-4 bg-[var(--border)] gap-px items-start">
        {semesterEntries.map(([semLabel, courses]) => {
          const semCredits = courses.reduce((s, c) => s + c.credits, 0);
          return (
            <div key={semLabel} className="bg-[var(--surface)] p-2.5">
              <h4 className="font-mono text-[10px] text-[var(--text-3)] uppercase tracking-wider mb-2">
                {semLabel}
              </h4>

              {courses.map((course: Course) => (
                <div
                  key={course.code}
                  className={`${course.category} rounded-[var(--r-sm)] p-1.5 mb-1.5 cursor-pointer transition-opacity hover:opacity-80`}
                  onClick={() =>
                    setExpandedCourse(
                      expandedCourse === course.code ? null : course.code
                    )
                  }
                  title={course.rationale}
                >
                  <div className="font-mono text-[10px] font-bold">{course.code}</div>
                  <div className="text-[11px] leading-tight mt-0.5">{course.name}</div>
                  <div className="text-[10px] mt-1 opacity-70">{course.credits} cr</div>
                  {expandedCourse === course.code && course.rationale && (
                    <div className="text-[10px] mt-1.5 pt-1.5 border-t border-current/20 leading-snug opacity-80">
                      {course.rationale}
                    </div>
                  )}
                </div>
              ))}

              <div className="text-[10px] text-[var(--text-3)] font-mono text-right mt-1">
                {semCredits} cr
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Credit totals — 5 columns (total + 4 categories) ── */}
      <div className="grid grid-cols-5 gap-px bg-[var(--border)] border-t border-[var(--border)]">
        <div className="bg-[var(--maroon-light)] p-3 text-center">
          <p className="font-mono text-[10px] text-[var(--maroon)] font-semibold uppercase">Total</p>
          <p className="text-lg font-bold text-[var(--maroon)]">
            {metrics.totalCredits}<span className="text-sm font-normal opacity-60"> / 48</span>
          </p>
        </div>
        <div className="bg-[var(--surface)] p-3 text-center">
          <p className="font-mono text-[10px] text-[var(--text-3)] uppercase">Core</p>
          <p className="text-base font-bold text-[var(--maroon)]">
            {metrics.categoryBreakdown['chip-core']}
          </p>
        </div>
        <div className="bg-[var(--surface)] p-3 text-center">
          <p className="font-mono text-[10px] text-[var(--text-3)] uppercase">Electives</p>
          <p className="text-base font-bold text-[var(--stone)]">
            {metrics.categoryBreakdown['chip-elective']}
          </p>
        </div>
        <div className="bg-[var(--surface)] p-3 text-center">
          <p className="font-mono text-[10px] text-[var(--text-3)] uppercase">Cert.</p>
          <p className="text-base font-bold text-[var(--burnt)]">
            {metrics.categoryBreakdown['chip-cert']}
          </p>
        </div>
        <div className="bg-[var(--surface)] p-3 text-center">
          <p className="font-mono text-[10px] text-[var(--text-3)] uppercase">
            {profile.track === 'thesis' ? 'Thesis' : 'Capstone'}
          </p>
          <p className="text-base font-bold text-[var(--forest)]">
            {metrics.categoryBreakdown['chip-thesis']}
          </p>
        </div>
      </div>

      {/* ── Planning pearl ── */}
      {planningPearl && (
        <div className="px-3.5 py-2.5 border-t border-[var(--border)] border-l-[3px] border-l-[var(--maroon)] bg-[var(--maroon-light)]">
          <p className="font-mono text-[10px] text-[var(--maroon)] uppercase tracking-wider mb-1">
            Planning pearl
          </p>
          <p className="text-[12px] text-[var(--text-2)] leading-relaxed">{planningPearl}</p>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex gap-2 flex-wrap p-2.5 border-t border-[var(--border)]">
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
                ? 'What does this plan look like on the capstone track instead?'
                : 'What does this plan look like on the thesis track instead?'
            )
          }
        >
          Switch to {profile.track === 'thesis' ? 'capstone' : 'thesis'} ↗
        </button>
        <button
          className="text-[11px] px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--maroon)] hover:text-[var(--maroon)] transition-colors"
          onClick={() => onSendPrompt('Can I add a certificate to this plan?')}
        >
          Add a certificate ↗
        </button>
        <button
          className="text-[11px] px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--maroon)] hover:text-[var(--maroon)] transition-colors"
          onClick={() =>
            onSendPrompt(
              `How does this plan change if I switch to ${
                profile.campus === 'blacksburg' ? 'Arlington' : 'Blacksburg'
              }?`
            )
          }
        >
          Try {profile.campus === 'blacksburg' ? 'Arlington' : 'Blacksburg'} ↗
        </button>
      </div>
    </div>
  );
}
