import { NextResponse } from "next/server";
import { getTeacherScheduleData } from "@/lib/live-class-service";

export async function GET() {
  const data = await getTeacherScheduleData({
    userId: 'cmoel9rqo0002yc1fy3t4950a', // devansh's ID
    role: 'MENTOR'
  });
  return NextResponse.json(data);
}
