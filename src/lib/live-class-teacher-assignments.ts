import {
  readJsonFromStorage,
  writeJsonToStorage,
} from "@/lib/supabase-admin";

export type LiveClassTeacherAssignmentRecord = {
  liveClassId: string;
  mentorIds: string[];
  assignedById: string | null;
  updatedAt: string;
};

const METADATA_PATH = "live-class-assignments/assignments.json";

export async function listLiveClassTeacherAssignments(): Promise<
  LiveClassTeacherAssignmentRecord[]
> {
  const raw = await readJsonFromStorage<LiveClassTeacherAssignmentRecord[]>(
    METADATA_PATH,
    []
  );

  return raw.filter(
    (record) =>
      typeof record.liveClassId === "string" &&
      Array.isArray(record.mentorIds) &&
      typeof record.updatedAt === "string"
  );
}

export async function getLiveClassTeacherAssignmentMap() {
  const assignments = await listLiveClassTeacherAssignments();
  return new Map(
    assignments.map((assignment) => [assignment.liveClassId, assignment])
  );
}

export function isMentorAssignedToLiveClass(
  assignment: LiveClassTeacherAssignmentRecord | undefined,
  mentorId: string
) {
  if (!assignment || assignment.mentorIds.length === 0) return true;
  return assignment.mentorIds.includes(mentorId);
}

export function getMentorAssignmentState(
  assignment: LiveClassTeacherAssignmentRecord | undefined,
  mentorId: string
) {
  if (!assignment || assignment.mentorIds.length === 0)
    return "shared" as const;
  return assignment.mentorIds.includes(mentorId)
    ? ("assigned" as const)
    : ("shared" as const);
}

export async function assignLiveClassToMentors(params: {
  liveClassId: string;
  mentorIds: string[];
  assignedById?: string | null;
}) {
  const assignments = await listLiveClassTeacherAssignments();
  const dedupedMentorIds = Array.from(
    new Set(params.mentorIds.filter((mentorId) => mentorId.trim()))
  );

  const record: LiveClassTeacherAssignmentRecord = {
    liveClassId: params.liveClassId,
    mentorIds: dedupedMentorIds,
    assignedById: params.assignedById ?? null,
    updatedAt: new Date().toISOString(),
  };

  const existingIndex = assignments.findIndex(
    (assignment) => assignment.liveClassId === params.liveClassId
  );

  if (existingIndex >= 0) {
    assignments[existingIndex] = record;
  } else {
    assignments.push(record);
  }

  await writeJsonToStorage(METADATA_PATH, assignments);

  return record;
}
