import React, { type ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';

const mocks = vi.hoisted(() => ({
  getPageAuth: vi.fn(),
  getSessionUser: vi.fn(),
  getStudentDashboardStats: vi.fn(),
  getUpcomingOverview: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock('@/lib/page-auth', () => ({ getPageAuth: mocks.getPageAuth }));
vi.mock('@/lib/session-user', () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock('@/lib/student-dashboard', () => ({
  getStudentDashboardStats: mocks.getStudentDashboardStats,
  getUpcomingOverview: mocks.getUpcomingOverview,
}));
vi.mock('@/context/auth-context', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string | { src: string }; alt: string }) => <img src={typeof src === 'string' ? src : src.src} alt={alt} />,
}));
// Panels that fetch their own data, and scroll-triggered animations, are out of scope here.
vi.mock('@/app/dashboard/_components/announcements-panel', () => ({ AnnouncementsPanel: () => null }));
vi.mock('@/app/dashboard/_components/sidebar-nav', () => ({ DashboardSidebar: () => null }));
vi.mock('@/components/notifications-dropdown', () => ({ NotificationsDropdown: () => null }));
vi.mock('@/components/global-search', () => ({ GlobalSearch: () => null }));
vi.mock('@/app/dashboard/_components/motion-wrappers', () => {
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return { PageTransition: Pass, RevealSection: Pass, StaggerGrid: Pass, FloatPulse: Pass };
});

import DashboardPage from '@/app/dashboard/page';
import StudentDashboard from '@/app/dashboard/_components/student-dashboard';

const sessionUser = { id: 'u1', name: 'Asha Verma', email: 'asha@example.com', role: 'STUDENT', image: null };
const stats = {
  enrollmentCount: 3,
  streakCount: 5,
  xpPoints: 1200,
  enrolledCourses: [
    {
      id: 'c1',
      title: 'JEE Physics',
      slug: 'jee-physics',
      thumbnail: null,
      description: null,
      progressPercent: 40,
      meta: '12 lessons',
      teacherName: 'R. Iyer',
      enrolledAt: new Date('2026-09-01T10:00:00.000Z'),
    },
  ],
};
const overview = {
  nextClass: null,
  nextExam: null,
  nextAssignment: null,
  counts: { upcomingClasses: 2, openExams: 4, pendingAssignments: 6 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPageAuth.mockResolvedValue({ userId: 'u1', email: 'asha@example.com', role: 'STUDENT' });
  mocks.getSessionUser.mockResolvedValue(sessionUser);
  mocks.getStudentDashboardStats.mockResolvedValue(stats);
  mocks.getUpcomingOverview.mockResolvedValue(overview);
  // The client-side session is still loading on first paint.
  mocks.useAuth.mockReturnValue({ user: null, isLoading: true });
  // Background revalidation must not resolve during the test.
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
});

describe('DashboardPage (server)', () => {
  it('seeds SWR with the exact JSON the API routes return', async () => {
    const element = (await DashboardPage()) as React.ReactElement<{
      value: { fallback: Record<string, unknown> };
      children: React.ReactElement<{ initialUser: unknown }>;
    }>;

    const { fallback } = element.props.value;
    expect(Object.keys(fallback).sort()).toEqual([
      '/api/users/me/stats',
      '/api/users/me/upcoming-overview',
    ]);
    expect(fallback['/api/users/me/upcoming-overview']).toEqual({ success: true, data: overview });
    expect(fallback['/api/users/me/stats']).toMatchObject({
      success: true,
      data: { xpPoints: 1200, enrolledCourses: [{ enrolledAt: '2026-09-01T10:00:00.000Z' }] },
    });
    expect(element.props.children.props.initialUser).toEqual(sessionUser);
  });

  it('renders without prefetching when there is no student session', async () => {
    mocks.getPageAuth.mockResolvedValue(null);

    const element = (await DashboardPage()) as React.ReactElement;

    expect(element.type).toBe(StudentDashboard);
    expect(mocks.getStudentDashboardStats).not.toHaveBeenCalled();
  });

  it('falls back to client-side loading if the prefetch fails', async () => {
    mocks.getUpcomingOverview.mockRejectedValue(new Error('db down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const element = (await DashboardPage()) as React.ReactElement;

    expect(element.type).toBe(StudentDashboard);
    expect(errorSpy).toHaveBeenCalledWith('[DASHBOARD_PREFETCH_ERROR]', expect.any(Error));
    errorSpy.mockRestore();
  });
});

describe('StudentDashboard (client) first paint', () => {
  it('shows real data immediately from the server seed, with no spinner', async () => {
    const element = (await DashboardPage()) as React.ReactElement<{ value: { fallback: Record<string, unknown> } }>;

    render(
      <SWRConfig value={{ provider: () => new Map(), fallback: element.props.value.fallback }}>
        <StudentDashboard initialUser={sessionUser as never} />
      </SWRConfig>,
    );

    expect(screen.getByText('Welcome back, Asha!')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('JEE Physics')).toBeInTheDocument();
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });

  it('still shows the spinner when there is neither a seed nor a session', () => {
    const { container } = render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <StudentDashboard />
      </SWRConfig>,
    );

    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin, [role="status"]')).not.toBeNull();
  });
});
