const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const course = await prisma.course.findFirst();
    if (!course) {
      console.log('No courses found');
      return;
    }
    
    console.log('Updating course:', course.id);
    const dataToUpdate = {
      title: "Test Course Title",
      subtitle: undefined,
      description: "Test description",
      overviewContent: undefined,
      thumbnail: undefined,
      price: 0,
      isPublished: true,
      totalHours: undefined,
      lessonCount: undefined,
      courseRating: undefined,
      category: undefined,
      courseLevel: undefined,
      language: undefined,
      teachers: { set: [] }
    };
    
    // remove undefined values like Next.js JSON parser or Prisma does
    Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: dataToUpdate,
      include: {
        _count: { select: { chapters: true, enrollments: true } },
        teachers: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    console.log('Success:', updated.id);
  } catch (err) {
    console.error('Prisma Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
