import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  getLiveClassTeacherAssignmentMap,
  isMentorAssignedToLiveClass,
} from "@/lib/live-class-teacher-assignments";

export type CalendarAudience = "student" | "teacher" | "admin";
export type CalendarEventType = "assignment" | "liveClass" | "exam";

export type CalendarFeedEvent = {
  id: string;
  title: string;
  course: string;
  date: string;
  type: CalendarEventType;
  actionLabel: string;
  actionUrl: string;
  endDate?: string | null;
  examType?: string | null;
  duration?: number | null;
  durationMins?: number | null;
  meetingUrl?: string | null;
  points?: number | null;
};

export type CalendarFeed = {
  counts: {
    assignment: number;
    liveClass: number;
    exam: number;
    today: number;
    thisWeek: number;
    total: number;
  };
  courses: string[];
  events: CalendarFeedEvent[];
  windowEnd: string;
  windowStart: string;
};

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildActionMeta(params: {
  audience: CalendarAudience;
  courseSlug?: string | null;
  meetingUrl?: string | null;
  type: CalendarEventType;
}) {
  const { audience, courseSlug, meetingUrl, type } = params;

  if (type === "assignment") {
    if (audience === "teacher") {
      return {
        actionLabel: "Review assignments",
        actionUrl: "/dashboard/teacher/assignments",
      };
    }

    if (audience === "admin") {
      return {
        actionLabel: "View assignment queue",
        actionUrl: "/admin/assignments",
      };
    }

    return {
      actionLabel: "Open assignments",
      actionUrl: "/dashboard/assignments",
    };
  }

  if (type === "liveClass") {
    if (audience === "teacher") {
      return {
        actionLabel: meetingUrl ? "Open class" : "Open class control",
        actionUrl: meetingUrl ?? "/dashboard/teacher/class-control",
      };
    }

    if (audience === "admin") {
      return {
        actionLabel: "Review live classes",
        actionUrl: "/admin/live-classes",
      };
    }

    return {
      actionLabel: meetingUrl ? "Join class" : "Open live classes",
      actionUrl: meetingUrl ?? "/dashboard/live-classes",
    };
  }

  if (audience === "teacher") {
    return {
      actionLabel: "Open exam review",
      actionUrl: "/dashboard/teacher/exam-review",
    };
  }

  if (audience === "admin") {
    return {
      actionLabel: "Manage exams",
      actionUrl: "/admin/exams",
    };
  }

  return {
    actionLabel: "Open tests",
    actionUrl: courseSlug ? `/dashboard/courses/${courseSlug}/tests` : "/dashboard/tests",
  };
}

async function getScopedCourseIds(params: { role: UserRole; userId: string }) {
  if (params.role === "STUDENT") {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: "ACTIVE",
        userId: params.userId,
      },
      select: {
        course: {
          select: {
            title: true,
          },
        },
        courseId: true,
      },
    });

    return {
      courseIds: enrollments.map((enrollment) => enrollment.courseId),
      courseTitles: enrollments.map((enrollment) => enrollment.course.title),
    };
  }

  if (params.role === "MENTOR") {
    const courses = await prisma.course.findMany({
      where: {
        teachers: {
          some: { id: params.userId },
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    return {
      courseIds: courses.map((course) => course.id),
      courseTitles: courses.map((course) => course.title),
    };
  }

  return {
    courseIds: null,
    courseTitles: [] as string[],
  };
}

export async function getCalendarFeed(params: {
  audience: CalendarAudience;
  role: UserRole;
  userId: string;
}) {
  const windowStart = startOfDay();
  const windowEnd = endOfDay(addDays(windowStart, 120));
  const scope = await getScopedCourseIds({
    role: params.role,
    userId: params.userId,
  });

  if (scope.courseIds && scope.courseIds.length === 0) {
    return {
      counts: {
        assignment: 0,
        exam: 0,
        liveClass: 0,
        thisWeek: 0,
        today: 0,
        total: 0,
      },
      courses: [],
      events: [],
      windowEnd: windowEnd.toISOString(),
      windowStart: windowStart.toISOString(),
    } satisfies CalendarFeed;
  }

  const scopedCourseWhere = scope.courseIds
    ? { courseId: { in: scope.courseIds } }
    : undefined;

  const [assignments, liveClasses, exams] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        ...scopedCourseWhere,
        deadline: {
          gte: windowStart,
          lte: windowEnd,
        },
        status: "ACTIVE",
      },
      select: {
        course: {
          select: {
            slug: true,
            title: true,
          },
        },
        deadline: true,
        id: true,
        points: true,
        title: true,
      },
      orderBy: { deadline: "asc" },
    }),
    prisma.liveClass.findMany({
      where: {
        ...scopedCourseWhere,
        startTime: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      select: {
        course: {
          select: {
            slug: true,
            title: true,
          },
        },
        duration: true,
        id: true,
        meetingUrl: true,
        startTime: true,
        title: true,
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.courseTest.findMany({
      where: {
        ...scopedCourseWhere,
        availableFrom: {
          gte: windowStart,
          lte: windowEnd,
        },
        status: "PUBLISHED",
      },
      select: {
        availableFrom: true,
        availableUntil: true,
        course: {
          select: {
            slug: true,
            title: true,
          },
        },
        durationMins: true,
        id: true,
        title: true,
        type: true,
      },
      orderBy: { availableFrom: "asc" },
    }),
  ]);

  const visibleLiveClasses =
    params.role === "MENTOR"
      ? (() => {
          const assignmentMapPromise = getLiveClassTeacherAssignmentMap();
          return assignmentMapPromise.then((assignmentMap) =>
            liveClasses.filter((liveClass) =>
              isMentorAssignedToLiveClass(assignmentMap.get(liveClass.id), params.userId),
            ),
          );
        })()
      : Promise.resolve(liveClasses);

  const filteredLiveClasses = await visibleLiveClasses;

  const assignmentEvents = assignments.flatMap((assignment) => {
    if (!assignment.course || !assignment.deadline) {
      return [];
    }

    const action = buildActionMeta({
      audience: params.audience,
      courseSlug: assignment.course.slug,
      type: "assignment",
    });

    return {
      ...action,
      course: assignment.course.title,
      date: assignment.deadline.toISOString(),
      id: assignment.id,
      points: assignment.points,
      title: assignment.title,
      type: "assignment",
    } satisfies CalendarFeedEvent;
  });

  const liveClassEvents = filteredLiveClasses.map((liveClass) => {
    const action = buildActionMeta({
      audience: params.audience,
      meetingUrl: liveClass.meetingUrl,
      type: "liveClass",
    });

    return {
      ...action,
      course: liveClass.course.title,
      date: liveClass.startTime.toISOString(),
      duration: liveClass.duration,
      id: liveClass.id,
      meetingUrl: liveClass.meetingUrl,
      title: liveClass.title,
      type: "liveClass",
    } satisfies CalendarFeedEvent;
  });

  const examEvents = exams.flatMap((exam) => {
    if (!exam.availableFrom) {
      return [];
    }

    const action = buildActionMeta({
      audience: params.audience,
      courseSlug: exam.course.slug,
      type: "exam",
    });

    return {
      ...action,
      course: exam.course.title,
      date: exam.availableFrom.toISOString(),
      durationMins: exam.durationMins,
      endDate: exam.availableUntil?.toISOString() ?? null,
      examType: exam.type,
      id: exam.id,
      title: exam.title,
      type: "exam",
    } satisfies CalendarFeedEvent;
  });

  const events = [
    ...assignmentEvents,
    ...liveClassEvents,
    ...examEvents,
  ].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  const today = startOfDay();
  const weekEnd = endOfDay(addDays(today, 7));
  const courseTitles = Array.from(new Set(events.map((event) => event.course)));

  return {
    counts: {
      assignment: events.filter((event) => event.type === "assignment").length,
      exam: events.filter((event) => event.type === "exam").length,
      liveClass: events.filter((event) => event.type === "liveClass").length,
      thisWeek: events.filter((event) => {
        const date = new Date(event.date);
        return date >= today && date <= weekEnd;
      }).length,
      today: events.filter((event) => isSameDay(new Date(event.date), today)).length,
      total: events.length,
    },
    courses: courseTitles,
    events,
    windowEnd: windowEnd.toISOString(),
    windowStart: windowStart.toISOString(),
  } satisfies CalendarFeed;
}
