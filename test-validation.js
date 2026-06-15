const { z } = require('zod');

const CreateCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  overviewContent: z.string().optional(),
  thumbnail: z.string().optional(),
  price: z.number().min(0).optional(),
  originalPrice: z.number().min(0).optional(),
  pricingType: z.enum(['PAID', 'FREE']).default('FREE'),
  teacherIds: z.array(z.string().cuid('Invalid teacher ID')).optional(),
  totalHours: z.number().min(0).optional().nullable(),
  lessonCount: z.number().min(0).optional().nullable(),
  examCount: z.number().min(0).optional().nullable(),
  courseRating: z.number().min(0).max(5).optional().nullable(),
  autoCalculateRating: z.boolean().default(true),
  enrolledStudents: z.number().min(0).optional().nullable(),
  maxSeats: z.number().int().nonnegative().optional().nullable(),
  autoUpdateEnrolled: z.boolean().default(true),
  learningOutcomes: z.any().optional(),
  features: z.any().optional(),
  testimonials: z.any().optional(),
  faqs: z.any().optional(),
  category: z.string().optional().nullable(),
  courseLevel: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  visibility: z.string().default('PUBLIC'),
  publishDate: z.string().optional().nullable(),
  emiPlans: z.array(
    z.object({
      label: z.string().min(1),
      amount: z.number().min(0),
      dueDays: z.number().int().min(0),
    })
  ).optional().nullable(),
});

const payload = {
  title: "test course",
  subtitle: "",
  description: "",
  overviewContent: "",
  thumbnail: undefined,
  price: 0,
  teacherIds: [],
  totalHours: undefined,
  lessonCount: undefined,
  examCount: undefined,
  courseRating: undefined,
  autoCalculateRating: true,
  enrolledStudents: undefined,
  maxSeats: undefined,
  autoUpdateEnrolled: true,
  learningOutcomes: [],
  category: "",
  courseLevel: "",
  language: "",
  visibility: "Public",
  pricingType: "Paid",
  originalPrice: undefined,
  emiPlans: null,
  testimonials: null,
  faqs: null
};

const parsed = CreateCourseSchema.safeParse(payload);
if (!parsed.success) {
  console.log("Failed:", parsed.error.flatten());
} else {
  console.log("Success!");
}
