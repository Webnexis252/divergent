import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const liveClassArgs = {
  include: {
    course: { select: { title: true, slug: true } },
    _count: { select: { attendances: { where: { isCounted: true } } } },
    teacherResources: { select: { id: true, title: true, fileUrl: true, type: true } },
  },
};

interface DebugLiveClass {
  id: string;
  title: string;
  courseId: string;
  course: { title: string; slug: string };
  startTime: Date;
  duration: number;
  isEnded: boolean;
  recordingUrl?: string | null;
}

function getLiveClassStatus(item: DebugLiveClass, now = new Date()) {
  if (item.isEnded) return "completed" as const;
  const start = new Date(item.startTime);
  const end = new Date(start.getTime() + item.duration * 60 * 1000);
  if (start <= now && now <= end) return "live" as const;
  if (end < now) return "completed" as const;
  return "upcoming" as const;
}

async function main() {
  const rows = await prisma.liveClass.findMany({
    orderBy: { startTime: 'asc' },
    ...liveClassArgs
  });
  
  const scheduleItems = rows.map((liveClass: DebugLiveClass) => {
    const item = {
      id: liveClass.id,
      title: liveClass.title,
      courseId: liveClass.courseId,
      courseTitle: liveClass.course.title,
      startTime: liveClass.startTime.toISOString(),
      duration: liveClass.duration,
      isEnded: liveClass.isEnded,
    };
    return { ...item, status: getLiveClassStatus(item) };
  });

  const completed = scheduleItems.filter(i => i.status === 'completed');
  console.log("Total completed classes:", completed.length);
  if (completed.length > 0) {
    console.log("Sample completed class:", completed[0]);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
