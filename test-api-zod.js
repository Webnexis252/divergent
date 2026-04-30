const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const course = await prisma.course.findFirst();
    
    // Simulate what the API is doing
    const dataToUpdate = {};
    if (course.learningOutcomes !== undefined) dataToUpdate.learningOutcomes = course.learningOutcomes ? JSON.parse(JSON.stringify(course.learningOutcomes)) : null;
    if (course.features !== undefined) dataToUpdate.features = course.features ? JSON.parse(JSON.stringify(course.features)) : null;
    if (course.testimonials !== undefined) dataToUpdate.testimonials = course.testimonials ? JSON.parse(JSON.stringify(course.testimonials)) : null;
    if (course.faqs !== undefined) dataToUpdate.faqs = course.faqs ? JSON.parse(JSON.stringify(course.faqs)) : null;
    if (course.publishDate !== undefined) dataToUpdate.publishDate = course.publishDate ? new Date(course.publishDate) : null;
    
    dataToUpdate.teachers = { set: [] }; // try clearing teachers

    const res = await prisma.course.update({
      where: { id: course.id },
      data: dataToUpdate,
      include: {
        _count: { select: { chapters: true, enrollments: true } },
        teachers: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    console.log('Update success', res.id);
  } catch(e) {
    console.error('Update failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
