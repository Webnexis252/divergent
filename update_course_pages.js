const fs = require('fs');

// 1. Update src/app/admin/courses/page.tsx
let page = fs.readFileSync('src/app/admin/courses/page.tsx', 'utf-8');

page = page.replace(
  `  const [form, setForm] = useState({
    title: "",
    description: "",
    thumbnail: "",
    price: "",
    teacherIds: [] as string[],
  });`,
  `  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    overviewContent: "",
    thumbnail: "",
    price: "",
    teacherIds: [] as string[],
    totalHours: "",
    lessonCount: "",
    courseRating: "",
    autoCalculateRating: true,
    enrolledStudents: "",
    autoUpdateEnrolled: true,
    learningOutcomes: [] as string[],
    category: "",
    courseLevel: "",
    language: "",
    visibility: "Public",
    pricingType: "Paid",
  });`
);

const fetchBodyOld = `        body: JSON.stringify({
          title: form.title,
          description: form.description,
          thumbnail: form.thumbnail || undefined,
          price: 0, // Forced free for testing period
          teacherIds: form.teacherIds,
        }),`;
const fetchBodyNew = `        body: JSON.stringify({
          title: form.title,
          subtitle: form.subtitle,
          description: form.description,
          overviewContent: form.overviewContent,
          thumbnail: form.thumbnail || undefined,
          price: 0,
          teacherIds: form.teacherIds,
          totalHours: form.totalHours ? Number(form.totalHours) : undefined,
          lessonCount: form.lessonCount ? Number(form.lessonCount) : undefined,
          courseRating: form.courseRating ? Number(form.courseRating) : undefined,
          autoCalculateRating: form.autoCalculateRating,
          enrolledStudents: form.enrolledStudents ? Number(form.enrolledStudents) : undefined,
          autoUpdateEnrolled: form.autoUpdateEnrolled,
          learningOutcomes: form.learningOutcomes,
          category: form.category,
          courseLevel: form.courseLevel,
          language: form.language,
          visibility: form.visibility,
          pricingType: form.pricingType,
        }),`;
page = page.replace(fetchBodyOld, fetchBodyNew);

const resetOld = `setForm({ title: "", description: "", thumbnail: "", price: "", teacherIds: [] });`;
const resetNew = `setForm({ title: "", subtitle: "", description: "", overviewContent: "", thumbnail: "", price: "", teacherIds: [], totalHours: "", lessonCount: "", courseRating: "", autoCalculateRating: true, enrolledStudents: "", autoUpdateEnrolled: true, learningOutcomes: [], category: "", courseLevel: "", language: "", visibility: "Public", pricingType: "Paid" });`;
page = page.replace(resetOld, resetNew);

const uiFieldsOld = `                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
                    <TextAreaField
                      hint="Keep it concise. This is the summary learners see before they commit."`;

const newFieldsUI = `
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Subtitle/Tagline" onChange={e => setForm(p => ({...p, subtitle: e.target.value}))} value={form.subtitle} placeholder="e.g. Master the fundamentals" />
                    <Field label="Total Hours" onChange={e => setForm(p => ({...p, totalHours: e.target.value}))} value={form.totalHours} placeholder="e.g. 12" type="number" />
                    <Field label="Number of Lessons" onChange={e => setForm(p => ({...p, lessonCount: e.target.value}))} value={form.lessonCount} placeholder="e.g. 24" type="number" />
                    <Field label="Course Rating" onChange={e => setForm(p => ({...p, courseRating: e.target.value}))} value={form.courseRating} placeholder="e.g. 4.8" type="number" step="0.1" />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Field label="Category" onChange={e => setForm(p => ({...p, category: e.target.value}))} value={form.category} placeholder="e.g. Design" />
                    <Field label="Course Level" onChange={e => setForm(p => ({...p, courseLevel: e.target.value}))} value={form.courseLevel} placeholder="e.g. Beginner" />
                    <Field label="Language" onChange={e => setForm(p => ({...p, language: e.target.value}))} value={form.language} placeholder="e.g. English" />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
                    <div className="flex flex-col gap-4">
                      <TextAreaField
                        hint="Keep it concise. This is the summary learners see before they commit."
                        label="Short description"
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Summarize the promise, pace, and outcome of the course."
                        rows={3}
                        value={form.description}
                      />
                      <TextAreaField
                        hint="Detailed description for the course overview."
                        label="Overview Content"
                        onChange={(e) => setForm((prev) => ({ ...prev, overviewContent: e.target.value }))}
                        placeholder="Detailed paragraphs..."
                        rows={6}
                        value={form.overviewContent}
                      />
                    </div>
`;
page = page.replace(uiFieldsOld, newFieldsUI);

fs.writeFileSync('src/app/admin/courses/page.tsx', page);

// 2. Update EditCourseModal.tsx
let modal = fs.readFileSync('src/app/admin/courses/EditCourseModal.tsx', 'utf-8');

modal = modal.replace(
  `type EditForm = {
  title: string;
  description: string;
  thumbnail: string;
  price: string;
  teacherIds: string[];
  isPublished: boolean;
};`,
  `type EditForm = {
  title: string;
  subtitle: string;
  description: string;
  overviewContent: string;
  thumbnail: string;
  price: string;
  teacherIds: string[];
  isPublished: boolean;
  totalHours: string;
  lessonCount: string;
  courseRating: string;
  category: string;
  courseLevel: string;
  language: string;
};`
);

modal = modal.replace(
  `  const [form, setForm] = useState<EditForm>({
    title: course.title,
    description: course.description ?? "",
    thumbnail: course.thumbnail ?? "",
    price: String(course.price),
    teacherIds: course.teachers?.map((t) => t.id) ?? [],
    isPublished: course.isPublished,
  });`,
  `  const [form, setForm] = useState<EditForm>({
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    overviewContent: course.overviewContent ?? "",
    thumbnail: course.thumbnail ?? "",
    price: String(course.price),
    teacherIds: course.teachers?.map((t) => t.id) ?? [],
    isPublished: course.isPublished,
    totalHours: course.totalHours !== null ? String(course.totalHours) : "",
    lessonCount: course.lessonCount !== null ? String(course.lessonCount) : "",
    courseRating: course.courseRating !== null ? String(course.courseRating) : "",
    category: course.category ?? "",
    courseLevel: course.courseLevel ?? "",
    language: course.language ?? "",
  });`
);

const fetchBodyEditOld = `        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          thumbnail: form.thumbnail || undefined,
          price: 0, // Forced free for testing period
          teacherIds: form.teacherIds,
          isPublished: form.isPublished,
        }),`;
const fetchBodyEditNew = `        body: JSON.stringify({
          title: form.title,
          subtitle: form.subtitle || undefined,
          description: form.description || undefined,
          overviewContent: form.overviewContent || undefined,
          thumbnail: form.thumbnail || undefined,
          price: 0,
          teacherIds: form.teacherIds,
          isPublished: form.isPublished,
          totalHours: form.totalHours ? Number(form.totalHours) : undefined,
          lessonCount: form.lessonCount ? Number(form.lessonCount) : undefined,
          courseRating: form.courseRating ? Number(form.courseRating) : undefined,
          category: form.category || undefined,
          courseLevel: form.courseLevel || undefined,
          language: form.language || undefined,
        }),`;
modal = modal.replace(fetchBodyEditOld, fetchBodyEditNew);

const editUIOld = `          {/* Description & Thumbnail */}
          <div className="grid gap-4 sm:grid-cols-[1fr_0.7fr]">
            <TextAreaField
              label="Short description"`;
const editUINew = `          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subtitle/Tagline" onChange={e => setForm(p => ({...p, subtitle: e.target.value}))} value={form.subtitle} placeholder="e.g. Master the fundamentals" />
            <Field label="Total Hours" onChange={e => setForm(p => ({...p, totalHours: e.target.value}))} value={form.totalHours} placeholder="e.g. 12" type="number" />
            <Field label="Number of Lessons" onChange={e => setForm(p => ({...p, lessonCount: e.target.value}))} value={form.lessonCount} placeholder="e.g. 24" type="number" />
            <Field label="Course Rating" onChange={e => setForm(p => ({...p, courseRating: e.target.value}))} value={form.courseRating} placeholder="e.g. 4.8" type="number" step="0.1" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Category" onChange={e => setForm(p => ({...p, category: e.target.value}))} value={form.category} placeholder="e.g. Design" />
            <Field label="Course Level" onChange={e => setForm(p => ({...p, courseLevel: e.target.value}))} value={form.courseLevel} placeholder="e.g. Beginner" />
            <Field label="Language" onChange={e => setForm(p => ({...p, language: e.target.value}))} value={form.language} placeholder="e.g. English" />
          </div>

          {/* Description & Thumbnail */}
          <div className="grid gap-4 sm:grid-cols-[1fr_0.7fr]">
            <div className="flex flex-col gap-4">
              <TextAreaField
                label="Short description"
                hint="Concise summary for the course card."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Summarize the promise, pace, and outcome."
                rows={3}
              />
              <TextAreaField
                label="Overview Content"
                hint="Detailed description."
                value={form.overviewContent}
                onChange={(e) => setForm((p) => ({ ...p, overviewContent: e.target.value }))}
                placeholder="Detailed paragraphs..."
                rows={5}
              />
            </div>
`;
modal = modal.replace(editUIOld, editUINew);
// Remove the old TextAreaField up to <div className="space-y-3">
modal = modal.replace(
`              hint="Concise summary for the course card."
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Summarize the promise, pace, and outcome."
              rows={4}
            />
            <div className="space-y-3">`,
`            <div className="space-y-3">`
);

fs.writeFileSync('src/app/admin/courses/EditCourseModal.tsx', modal);
console.log('Pages updated');
