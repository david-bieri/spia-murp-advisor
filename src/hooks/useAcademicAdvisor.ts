// src/hooks/useAcademicAdvisor.ts
// Phase 3: plan state, types, credit metrics, course normalisation
// moveCourse stubbed — Phase 4 drag-and-drop (needs @dnd-kit/core)

import { useState, useMemo, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CourseCategory =
  | 'chip-core'
  | 'chip-elective'
  | 'chip-cert'
  | 'chip-thesis';

export interface Course {
  code: string;
  name: string;
  credits: number;
  category: CourseCategory;
  rationale?: string;
}

// Keys are semester labels: "Fall — year 1", "Spring — year 1", etc.
export type AcademicPlan = Record<string, Course[]>;

export interface PlanningMetrics {
  totalCredits: number;
  categoryBreakdown: Record<CourseCategory, number>;
  isValid: boolean;
  validationMessages: string[];
}

// ── Normalisation ─────────────────────────────────────────────────────────────
// Called on every course parsed from Jane's JSON output before it reaches
// any component. Guards against unexpected category values or missing fields.

const VALID_CATEGORIES: CourseCategory[] = [
  'chip-core',
  'chip-elective',
  'chip-cert',
  'chip-thesis',
];

export function normalizeCourse(raw: unknown): Course {
  const c = raw as Partial<Course>;
  return {
    code:     typeof c.code     === 'string'  ? c.code.trim() : 'UNKNOWN',
    name:     typeof c.name     === 'string'  ? c.name.trim() : '',
    credits:  typeof c.credits  === 'number' && c.credits > 0 ? c.credits : 3,
    category: VALID_CATEGORIES.includes(c.category as CourseCategory)
      ? (c.category as CourseCategory)
      : 'chip-elective', // safe fallback — never crashes the chip renderer
    rationale: typeof c.rationale === 'string' ? c.rationale : undefined,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAcademicAdvisor(initialPlan: AcademicPlan) {
  const [plan, setPlan] = useState<AcademicPlan>(initialPlan);
  const [activeSemester, setActiveSemester] = useState<string>(
    () => Object.keys(initialPlan)[0] ?? ''
  );

  const metrics = useMemo<PlanningMetrics>(() => {
    const breakdown: Record<CourseCategory, number> = {
      'chip-core':     0,
      'chip-elective': 0,
      'chip-cert':     0,
      'chip-thesis':   0,
    };

    const allCourses = Object.values(plan).flat();
    const totalCredits = allCourses.reduce((sum, c) => sum + c.credits, 0);

    for (const course of allCourses) {
      breakdown[course.category] = (breakdown[course.category] ?? 0) + course.credits;
    }

    // MURP validation: 48 total, 18 core minimum, 6+ thesis/capstone
    const validationMessages: string[] = [];

    if (totalCredits < 48) {
      validationMessages.push(`Total credits ${totalCredits} — need 48`);
    }
    if (breakdown['chip-core'] < 18) {
      validationMessages.push(`Core credits ${breakdown['chip-core']} — need 18`);
    }
    if (breakdown['chip-thesis'] < 6) {
      validationMessages.push('Thesis or capstone credits missing (need ≥6)');
    }

    // Flag any semester over 15 credits
    for (const [sem, courses] of Object.entries(plan)) {
      const semCredits = courses.reduce((s, c) => s + c.credits, 0);
      if (semCredits > 15) {
        validationMessages.push(`${sem}: ${semCredits} credits — heavy load`);
      }
    }

    const isValid = validationMessages.length === 0;
    return { totalCredits, categoryBreakdown: breakdown, isValid, validationMessages };
  }, [plan]);

  // moveCourse: state logic is ready; UI trigger deferred to Phase 4 (drag-and-drop)
  const moveCourse = useCallback(
    (courseCode: string, sourceSem: string, targetSem: string) => {
      setPlan(prev => {
        const sourceList = [...(prev[sourceSem] ?? [])];
        const targetList = [...(prev[targetSem] ?? [])];
        const idx = sourceList.findIndex(c => c.code === courseCode);
        if (idx === -1) return prev;
        const [moved] = sourceList.splice(idx, 1);
        targetList.push(moved);
        return { ...prev, [sourceSem]: sourceList, [targetSem]: targetList };
      });
    },
    []
  );

  return { plan, activeSemester, setActiveSemester, metrics, moveCourse };
}
