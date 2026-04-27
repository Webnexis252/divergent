import { Prisma, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  getLiveClassTeacherAssignmentMap,
  getMentorAssignmentState,
  isMentorAssignedToLiveClass,
} from "./live-class-teacher-assignments";
import {
  LiveClassData,
  LiveClassItem,
  TeacherScheduleData,
  TeacherScheduleItem,
  StudentScheduleData,
  StudentScheduleItem,
} from "./live-class-types";

const liveClassArgs = Prisma.validator<Prisma.LiveClassDefaultArgs>()({
  include: {
    course: {
      select: {
        title: true,
        slug: true,
      },
    },
    _count: {
      select: {
        attendances: {
          where: { isCounted: true },
        },
      },
    },
  },
});

type LiveClassRow = Prisma.LiveClassGetPayload<typeof liveClassArgs>;

function startOfToday(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getLiveClassStatus(item: LiveClassItem, now = new Date()) {
  const start = new Date(item.startTime);
  const end = new Date(start.getTime() + item.duration * 60 * 1000);

  if (start <= now && now <= end) return "live" as const;
  if (end < now) return "completed" as const;
  return "upcoming" as const;
}

function toLiveClassItem(liveClass: LiveClassRow): LiveClassItem {
  return {
    id: liveClass.id,
    title: liveClass.title,
    description: liveClass.description,
    courseTitle: liveClass.course.title,
    courseSlug: liveClass.course.slug,
    startTime: liveClass.startTime.toISOString(),
    duration: liveClass.duration,
    meetingUrl: liveClass.meetingUrl,
    recordingUrl: liveClass.recordingUrl,
    attendeeCount: liveClass._count.attendances,
  };
}

async function listLiveClassRows(where: Prisma.LiveClassWhereInput) {
  return prisma.liveClass.findMany({
    where,
    ...liveClassArgs,
    orderBy: {
      startTime: "asc",
    },
  });
}

export function bucketLiveClasses(
  items: LiveClassItem[],
  now = new Date()
): LiveClassData {
  const live: LiveClassItem[] = [];
  const upcoming: LiveClassItem[] = [];
  const completed: LiveClassItem[] = [];

  for (const item of items) {
    const status = getLiveClassStatus(item, now);

    if (status === "live") {
      live.push(item);
      continue;
    }

    if (status === "completed") {
      completed.push(item);
      continue;
    }

    upcoming.push(item);
  }

  completed.sort(
    (left, right) =>
      new Date(right.startTime).getTime() - new Date(left.startTime).getTime()
  );

  return {
    summary: {
      live: live.length,
      upcoming: upcoming.length,
      completed: completed.length,
    },
    live,
    upcoming,
    completed,
  };
}

export async function getAccessibleLiveClassForUser(params: {
  classId: string;
  userId: string;
  role: UserRole;
}) {
  const liveClass = await prisma.liveClass.findUnique({
    where: {
      id: params.classId,
    },
    select: {
      id: true,
      courseId: true,
    },
  });

  if (!liveClass) {
    return { liveClass: null, canAccess: false };
  }

  if (params.role === "ADMIN" || params.role === "SUPER_ADMIN") {
    return { liveClass, canAccess: true };
  }

  if (params.role === "MENTOR") {
    const courseAccess = await prisma.course.findFirst({
      where: {
        id: liveClass.courseId,
        teachers: {
          some: { id: params.userId },
        },
      },
    });

    if (!courseAccess) {
      return { liveClass, canAccess: false };
    }

    const assignments = await getLiveClassTeacherAssignmentMap();
    return {
      liveClass,
      canAccess: isMentorAssignedToLiveClass(
        assignments.get(params.classId),
        params.userId
      ),
    };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: params.userId,
      courseId: liveClass.courseId,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  return { liveClass, canAccess: Boolean(enrollment) };
}

export async function getTeacherScheduleData(params: {
  userId: string;
  role: UserRole;
}) {
  const now = new Date();
  const windowStart = startOfToday(now);
  const todayEnd = endOfDay(now);
  const windowEnd = endOfDay(
    new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  );

  const rows = await listLiveClassRows({
    startTime: {
      gte: windowStart,
      lte: windowEnd,
    },
    course: {
      teachers: {
        some: { id: params.userId },
      },
    },
  });

  const assignments = await getLiveClassTeacherAssignmentMap();
  const visibleRows =
    params.role === "MENTOR"
      ? rows.filter((row) =>
          isMentorAssignedToLiveClass(assignments.get(row.id), params.userId)
        )
      : rows;

  const scheduleItems = visibleRows.map((row) => {
    const item = toLiveClassItem(row);

    return {
      ...item,
      status: getLiveClassStatus(item, now),
      assignmentState: getMentorAssignmentState(
        assignments.get(row.id),
        params.userId
      ),
    } satisfies TeacherScheduleItem;
  });

  const today = scheduleItems.filter((item) => {
    const startTime = new Date(item.startTime);
    return startTime >= windowStart && startTime <= todayEnd;
  });

  const nextWeek = scheduleItems.filter((item) => {
    const startTime = new Date(item.startTime);
    return startTime > todayEnd && startTime <= windowEnd;
  });

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    counts: {
      today: today.length,
      nextWeek: nextWeek.length,
      live: scheduleItems.filter((item) => item.status === "live").length,
    },
    today,
    nextWeek,
  } satisfies TeacherScheduleData;
}

export async function getTeacherClassroomData(params: {
  classId: string;
  userId: string;
  role: UserRole;
}) {
  const accessibleClass = await getAccessibleLiveClassForUser(params);

  if (!accessibleClass.liveClass) return null;
  if (!accessibleClass.canAccess) return "forbidden" as const;

  const liveClass = await prisma.liveClass.findUnique({
    where: {
      id: params.classId,
    },
    ...liveClassArgs,
  });

  if (!liveClass) return null;

  return bucketLiveClasses([toLiveClassItem(liveClass)]);
}

export async function getStudentClassroomData(params: {
  classId: string;
  userId: string;
  role: UserRole;
}) {
  const accessibleClass = await getAccessibleLiveClassForUser(params);

  if (!accessibleClass.liveClass) return null;
  if (!accessibleClass.canAccess) return "forbidden" as const;

  const liveClass = await prisma.liveClass.findUnique({
    where: {
      id: params.classId,
    },
    ...liveClassArgs,
  });

  if (!liveClass) return null;

  return bucketLiveClasses([toLiveClassItem(liveClass)]);
}

export async function getStudentLiveClassData(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    select: {
      courseId: true,
    },
  });

  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  if (courseIds.length === 0) {
    return bucketLiveClasses([]);
  }

  const rows = await listLiveClassRows({
    courseId: {
      in: courseIds,
    },
  });

  return bucketLiveClasses(rows.map(toLiveClassItem));
}

export async function getTodayTeacherClasses(params: {
  userId: string;
  role: UserRole;
}) {
  const schedule = await getTeacherScheduleData(params);
  return schedule.today;
}

export async function getStudentScheduleData(
  userId: string
): Promise<StudentScheduleData> {
  const now = new Date();
  const windowStart = startOfToday(now);
  const todayEnd = endOfDay(now);
  const windowEnd = endOfDay(
    new Date(windowStart.getTime() + 7 * 24 * 60 * 60 * 1000)
  );

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    select: { courseId: true },
  });

  const courseIds = enrollments.map((e) => e.courseId);

  const rows =
    courseIds.length === 0
      ? []
      : await listLiveClassRows({
          courseId: { in: courseIds },
          startTime: { gte: windowStart, lte: windowEnd },
        });

  const scheduleItems: StudentScheduleItem[] = rows.map((row) => {
    const item = toLiveClassItem(row);
    return {
      ...item,
      status: getLiveClassStatus(item, now),
    };
  });

  const today = scheduleItems.filter((item) => {
    const t = new Date(item.startTime);
    return t >= windowStart && t <= todayEnd;
  });

  const thisWeek = scheduleItems.filter((item) => {
    const t = new Date(item.startTime);
    return t > todayEnd && t <= windowEnd;
  });

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    counts: {
      today: today.length,
      thisWeek: thisWeek.length,
      live: scheduleItems.filter((i) => i.status === "live").length,
    },
    today,
    thisWeek,
  };
}
