import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { apiSuccess, apiForbidden, apiServerError, apiError } from "@/lib/api-response";

/** Extract mentorId from URL path: /api/admin/mentors/{mentorId}/skills */
function getMentorId(req: NextRequest): string | null {
  const segments = new URL(req.url).pathname.split("/");
  // [..., 'mentors', '{mentorId}', 'skills']
  const idx = segments.indexOf("mentors");
  return idx !== -1 && segments[idx + 1] ? segments[idx + 1] : null;
}

const DEFAULT_SKILLS = [
  { label: "Subject Depth",      value: 80, color: "#4db6ac" },
  { label: "Guidance",           value: 80, color: "#ff8a65" },
  { label: "Feedback Quality",   value: 80, color: "#4fc3f7" },
  { label: "Presentation",       value: 80, color: "#ffd54f" },
  { label: "Doubt Solving",      value: 80, color: "#ba68c8" },
  { label: "Curriculum Design",  value: 80, color: "#fff176" },
  { label: "Student Engagement", value: 80, color: "#81d4fa" },
  { label: "Resource Prep",      value: 80, color: "#7986cb" },
];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const mentorId = getMentorId(req);
    if (!mentorId) return apiError("Mentor ID is required", 400);

    let skills = await prisma.mentorSkill.findMany({
      where: { mentorId },
      orderBy: { label: "asc" },
    });

    if (skills.length === 0) {
      await prisma.mentorSkill.createMany({
        data: DEFAULT_SKILLS.map((s) => ({
          mentorId,
          label: s.label,
          value: s.value,
          color: s.color,
        })),
        skipDuplicates: true,
      });
      skills = await prisma.mentorSkill.findMany({
        where: { mentorId },
        orderBy: { label: "asc" },
      });
    }

    return apiSuccess(skills);
  } catch (error) {
    console.error("[GET_MENTOR_SKILLS_ERROR]", error);
    return apiServerError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const mentorId = getMentorId(req);
    if (!mentorId) return apiError("Mentor ID is required", 400);

    const body = await req.json();
    const { skillId, value } = body;

    if (!skillId || value === undefined) {
      return apiError("skillId and value are required", 400);
    }

    const skill = await prisma.mentorSkill.update({
      where: { id: skillId, mentorId },
      data: { value: Math.max(0, Math.min(100, parseInt(value, 10))) },
    });

    return apiSuccess(skill);
  } catch (error) {
    console.error("[PATCH_MENTOR_SKILLS_ERROR]", error);
    return apiServerError();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const mentorId = getMentorId(req);
    if (!mentorId) return apiError("Mentor ID is required", 400);

    const body = await req.json();
    const { skills } = body as { skills: { id: string; value: number }[] };

    if (!Array.isArray(skills)) return apiError("skills array is required", 400);

    if (skills.length > 0) {
      const ids = skills.map((s) => s.id);
      
      // Build CASE statement for batch update
      const caseFragments = skills.map((s) =>
        Prisma.sql`WHEN ${s.id}::uuid THEN ${Math.max(0, Math.min(100, s.value))}::int`
      );

      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE "MentorSkill"
          SET "value" = CASE "id"
            ${Prisma.join(caseFragments, ' ')}
          END
          WHERE "mentorId" = ${mentorId}::uuid AND "id" = ANY(${ids}::uuid[])
        `
      );
    }
    
    // Fetch updated
    const updated = await prisma.mentorSkill.findMany({
      where: { mentorId, id: { in: skills.map((s) => s.id) } },
    });

    return apiSuccess(updated);
  } catch (error) {
    console.error("[PUT_MENTOR_SKILLS_ERROR]", error);
    return apiServerError();
  }
}
