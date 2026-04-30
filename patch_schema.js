const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');

const newFields = `
  subtitle           String?
  overviewContent    String?
  totalHours         Float?
  lessonCount        Int?
  courseRating       Float?
  autoCalculateRating Boolean @default(true)
  enrolledStudents   Int?
  autoUpdateEnrolled Boolean @default(true)
  learningOutcomes   Json?
  features           Json?
  testimonials       Json?
  faqs               Json?
  category           String?
  courseLevel        String?
  language           String?
  visibility         String    @default("PUBLIC")
  pricingType        String    @default("PAID")
  publishDate        DateTime?
`;

const updatedSchema = schema.replace(
  '  teacherResources TeacherResource[]\n}',
  '  teacherResources TeacherResource[]\n' + newFields + '}'
);

fs.writeFileSync('prisma/schema.prisma', updatedSchema);
console.log('Schema patched.');
