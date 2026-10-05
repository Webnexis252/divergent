import React, { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getPageAuth: vi.fn(),
  getStudentProgress: vi.fn(),
  getStudentSkillBreakdown: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@/lib/page-auth', () => ({ getPageAuth: mocks.getPageAuth }));
vi.mock('@/lib/student-progress', () => ({
  getStudentProgress: mocks.getStudentProgress,
  getStudentSkillBreakdown: mocks.getStudentSkillBreakdown,
}));
vi.mock('@/context/auth-context', () => ({ useAuth: () => ({ user: { name: 'Asha Verma' } }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/progress' }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock('@/app/dashboard/_components/sidebar-nav', () => ({ DashboardSidebar: () => null }));
vi.mock('@/app/dashboard/_components/student-live-class-schedule', () => ({ PastClassesSection: () => null }));
vi.mock('@/app/dashboard/_components/test-taking/category-performance-panel', () => ({
  CategoryPerformancePanel: () => null,
}));
vi.mock('@/app/dashboard/_components/motion-wrappers', () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    AnimHeading: Pass,
    FloatPulse: Pass,
    PageTransition: Pass,
    RevealSection: Pass,
    StaggerGrid: Pass,
    fadeUp: {},
    useReveal: () => true,
  };
});

import DashboardProgressPage from '@/app/dashboard/progress/page';
import ProgressView from '@/app/dashboard/progress/ProgressView';

const progress = {
  courseProgress: [
    {
      id: 'c1',
      title: 'JEE Physics',
      slug: 'jee-physics',
      thumbnail: null,
      percent: 40,
      completedLessons: 4,
      totalLessons: 10,
      lessons: '4 / 10 lessons completed',
      totalHours: 6,
    },
  ],
  chartData: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => ({ day, value: 0 })),
  upcomingClasses: [],
  missedClasses: [],
  weeklyGoals: [{ title: 'Complete 15 hours of study', percent: 20, color: '#62c6ff' }],
  weeklyStudyHours: 3,
  streakCount: 5,
  topicMastery: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPageAuth.mockResolvedValue({ userId: 'u1', role: 'STUDENT' });
  mocks.getStudentProgress.mockResolvedValue(progress);
  mocks.getStudentSkillBreakdown.mockResolvedValue({ skills: [], skillTestsEvaluated: 0 });
  mocks.fetch.mockImplementation(() => new Promise(() => {})); // client fetches never resolve
  vi.stubGlobal('fetch', mocks.fetch);
});

describe('DashboardProgressPage (server)', () => {
  it('loads progress and skills in parallel and passes them to the view', async () => {
    const element = (await DashboardProgressPage()) as React.ReactElement<{ initialData: unknown }>;

    expect(element.type).toBe(ProgressView);
    expect(element.props.initialData).toEqual({ progress, skills: [], skillTestsEvaluated: 0 });
    expect(mocks.getStudentProgress).toHaveBeenCalledWith('u1');
    expect(mocks.getStudentSkillBreakdown).toHaveBeenCalledWith('u1');
  });

  it('falls back to client-side loading when signed out or the prefetch fails', async () => {
    mocks.getPageAuth.mockResolvedValueOnce(null);
    expect(((await DashboardProgressPage()) as React.ReactElement<{ initialData?: unknown }>).props.initialData).toBeUndefined();

    mocks.getStudentProgress.mockRejectedValueOnce(new Error('db down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(((await DashboardProgressPage()) as React.ReactElement<{ initialData: unknown }>).props.initialData).toBeNull();
    errorSpy.mockRestore();
  });
});

describe('ProgressView (client) first paint', () => {
  it('renders the progress immediately from server data, without fetching', () => {
    render(<ProgressView initialData={{ progress, skills: [], skillTestsEvaluated: 0 }} />);

    expect(screen.getByText('JEE Physics')).toBeInTheDocument();
    expect(screen.queryByText(/Loading your progress snapshot/)).not.toBeInTheDocument();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('without server data, requests progress and skills at the same time', () => {
    render(<ProgressView />);

    expect(screen.getByText(/Loading your progress snapshot/)).toBeInTheDocument();
    expect(mocks.fetch.mock.calls.map(([url]) => url).sort()).toEqual([
      '/api/users/me/profile-stats',
      '/api/users/me/progress',
    ]);
  });
});
