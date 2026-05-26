// src/components/DegreePlanCard.tsx
// Phase 3: wrapper that parses DEGREE_PLAN JSON, normalises courses,
// and renders DesktopGrid (≥640px) or MobileTabs (<640px)

'use client';

import React, { useEffect, useState } from 'react';
import { useAcademicAdvisor, normalizeCourse } from '@/hooks/useAcademicAdvisor';
import type { AcademicPlan } from '@/hooks/useAcademicAdvisor';
import { DesktopGrid } from './DesktopGrid';
import { MobileTabs } from './MobileTabs';

// ── Raw JSON shape from Jane ──────────────────────────────────────────────────

interface RawCourse {
  code: string;
  name: string;
  credits: number;
  category: string;
  rationale?: string;
}

interface RawSemester {
  label: string;
  courses: RawCourse[];
}

export interface DegreePlan {
  type: 'DEGREE_PLAN';
  profile: {
    campus: 'blacksburg' | 'arlington';
    focus: string;
    certificate: string | null;
    track: 'thesis' | 'capstone';
  };
  semesters: RawSemester[];
  planning_pearl?: string;
  credit_totals: {
    total: number;
    core: number;
    elective: number;
    certificate: number;
    thesis: number;
  };
  warnings: string[];
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isDegreePlan(obj: unknown): obj is DegreePlan {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as DegreePlan).type === 'DEGREE_PLAN' &&
    Array.isArray((obj as DegreePlan).semesters) &&
    typeof (obj as DegreePlan).profile === 'object'
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  plan: DegreePlan;
  onSendPrompt: (text: string) => void;
}

export function DegreePlanCard({ plan, onSendPrompt }: Props) {
  // Build normalised AcademicPlan from raw JSON
  // normalizeCourse() guards every course against bad category values
  const normalizedPlan: AcademicPlan = Object.fromEntries(
    plan.semesters.map(sem => [
      sem.label,
      sem.courses.map(normalizeCourse),
    ])
  );

  const { plan: advisorPlan, activeSemester, setActiveSemester, metrics } =
    useAcademicAdvisor(normalizedPlan);

  // Responsive: switch between DesktopGrid and MobileTabs
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const sharedProps = {
    plan: advisorPlan,
    profile: plan.profile,
    planningPearl: plan.planning_pearl,
    onSendPrompt,
  };

  return isMobile ? (
    <MobileTabs
      {...sharedProps}
      activeSemester={activeSemester}
      onSelectSemester={setActiveSemester}
      creditTotal={metrics.totalCredits}
    />
  ) : (
    <DesktopGrid
      {...sharedProps}
      metrics={metrics}
    />
  );
}
