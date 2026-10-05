export type Mentor = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  mentorStatus: string | null;
  _count: { managedDoubts: number; doubtReplies: number };
  managedDoubts: { id: string }[];
  /** First human answer to doubts assigned in the last 30 days */
  responseTime?: { asked: number; answered: number; withinTwoHours: number; medianMinutes: number | null } | null;
};
