import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CreateLiveClassSchema } from '@/lib/validators';
import { assignLiveClassToMentors } from '@/lib/live-class-teacher-assignments';
import { createDailyRoom } from '@/lib/daily';
import { apiSuccess, apiCreated, apiError, apiForbidden, apiUnauthorized, apiServerError } from '@/lib/api-response';

type Params = { params: Promise<{ courseId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const { courseId } = await params;

    const classes = await prisma.liveClass.findMany({
      where: { courseId },
      orderBy: { startTime: 'asc' },
    });
    return apiSuccess(classes);
  } catch (err) {
    console.error('[GET_LIVE_CLASSES_ERROR]', err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'MENTOR', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Only admins and mentors can schedule classes');

    const { courseId } = await params;
    const body = await req.json();
    
    const parsed = CreateLiveClassSchema.safeParse({ ...body, courseId });
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const { title, description, startTime, duration, meetingUrl, teacherId } = parsed.data;

    // Auto-create a Daily.co room if API key is configured
    let finalMeetingUrl = meetingUrl ?? null;
    if (!finalMeetingUrl) {
      const roomName = `class-${courseId.slice(-6)}-${Date.now()}`;
      const room = await createDailyRoom({
        roomName,
        expiresInMinutes: duration + 60, // extra 60 min buffer
      });
      if (room) {
        finalMeetingUrl = room.url;
      }
    }

    const liveClass = await prisma.liveClass.create({
      data: {
        courseId,
        title,
        description,
        startTime: new Date(startTime),
        duration,
        meetingUrl: finalMeetingUrl,
      }
    });

    if (user.role === 'MENTOR') {
      await assignLiveClassToMentors({
        liveClassId: liveClass.id,
        mentorIds: [user.userId],
        assignedById: user.userId,
      });
    } else if (teacherId) {
      await assignLiveClassToMentors({
        liveClassId: liveClass.id,
        mentorIds: [teacherId],
        assignedById: user.userId,
      });
    }

    return apiCreated(liveClass, 'Live class scheduled successfully');
  } catch (err) {
    console.error('[CREATE_LIVE_CLASS_ERROR]', err);
    return apiServerError();
  }
}
