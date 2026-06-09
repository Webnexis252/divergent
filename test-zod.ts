import { z } from 'zod';
export const CreateAssignmentSchema = z.object({
  courseId: z.string().cuid('Invalid course ID').optional().nullable(),
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  deadline: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date string',
    }),
  points: z.number().int().min(0).default(0),
  attachmentUrl: z.string().optional().nullable(),
});

const result = CreateAssignmentSchema.safeParse({
  title: "1",
  courseId: "clxto2n3j000008lc6d252j9c",
  points: 100,
});
console.log(JSON.stringify(result, null, 2));
