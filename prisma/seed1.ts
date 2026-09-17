import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting academic seed...');

  // ============================================================
  // Departments
  // ============================================================

  const departmentNames = ['أمن معلومات', 'علوم حاسوب', 'تقنية معلومات'];

  const departments: Array<{ id: number; name: string }> = [];

  for (const name of departmentNames) {
    const department = await prisma.department.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
      },
    });

    departments.push(department);
  }

  console.log('✅ Departments seeded');

  // ============================================================
  // Levels
  // ============================================================

  const levels = [
    {
      number: 1,
      name: 'المستوى الأول',
    },
    {
      number: 2,
      name: 'المستوى الثاني',
    },
    {
      number: 3,
      name: 'المستوى الثالث',
    },
    {
      number: 4,
      name: 'المستوى الرابع',
    },
  ];

  for (const level of levels) {
    await prisma.level.upsert({
      where: {
        number: level.number,
      },
      update: {
        name: level.name,
      },
      create: level,
    });
  }

  const levelOne = await prisma.level.findUnique({
    where: {
      number: 1,
    },
  });

  if (!levelOne) {
    throw new Error('❌ المستوى الأول غير موجود');
  }

  console.log('✅ Levels seeded');

  // ============================================================
  // Terms
  // ============================================================

  const terms = [
    {
      number: 1,
      name: 'الترم الأول',
    },
    {
      number: 2,
      name: 'الترم الثاني',
    },
  ];

  for (const term of terms) {
    await prisma.term.upsert({
      where: {
        number: term.number,
      },
      update: {
        name: term.name,
      },
      create: term,
    });
  }

  const firstTerm = await prisma.term.findUnique({
    where: {
      number: 1,
    },
  });

  if (!firstTerm) {
    throw new Error('❌ الترم الأول غير موجود');
  }

  console.log('✅ Terms seeded');

  // ============================================================
  // Academic Years
  // فقط 2025/2026 و 2026/2027
  // ============================================================

  const academicYearValues = [
    {
      startYear: 2025,
      endYear: 2026,
    },
    {
      startYear: 2026,
      endYear: 2027,
    },
  ];

  const academicYears: Array<{
    id: number;
    startYear: number;
    endYear: number;
  }> = [];

  for (const year of academicYearValues) {
    const academicYear = await prisma.academicYear.upsert({
      where: {
        startYear_endYear: {
          startYear: year.startYear,
          endYear: year.endYear,
        },
      },
      update: {},
      create: year,
    });

    academicYears.push(academicYear);
  }

  console.log('✅ Academic years seeded');

  // ============================================================
  // Tracks
  // تقنية معلومات فقط
  // ============================================================

  const informationTechnology = await prisma.department.findUnique({
    where: {
      name: 'تقنية معلومات',
    },
  });

  if (!informationTechnology) {
    throw new Error('❌ تخصص تقنية معلومات غير موجود');
  }

  const trackNames = ['شبكات', 'برمجيات'];

  for (const name of trackNames) {
    await prisma.track.upsert({
      where: {
        departmentId_name: {
          departmentId: informationTechnology.id,
          name,
        },
      },
      update: {},
      create: {
        name,
        departmentId: informationTechnology.id,
      },
    });
  }

  console.log('✅ Tracks seeded');

  // ============================================================
  // Level 1 / Term 1 Courses
  // ============================================================

  const courseNames = [
    'مقدمة في علوم الحاسوب',
    'برمجة حاسب 1',
    'هياكل متقطعة للحوسبة',
    'حساب التفاضل',
    'اللغة الإنجليزية 1',
    'اللغة العربية 1',
    'الثقافة الإسلامية 1',
  ];

  // ============================================================
  // Create Courses
  //
  // Course لا يرتبط بالتخصص.
  // الارتباط يتم من خلال CourseOffering.
  // ============================================================

  const courses: Array<{
    id: number;
    name: string;
    code: string | null;
  }> = [];

  for (const name of courseNames) {
    const course = await prisma.course.findFirst({
      where: {
        name,
      },
    });

    if (course) {
      courses.push(course);
    } else {
      const newCourse = await prisma.course.create({
        data: {
          name,
        },
      });

      courses.push(newCourse);
    }
  }

  console.log(`✅ ${courses.length} courses created/found`);

  // ============================================================
  // Create Course Offerings
  //
  // 3 Departments
  // × 7 Courses
  // × 2 Academic Years
  // = 42 Offerings
  //
  // المستوى الأول
  // الترم الأول
  // بدون Track
  // ============================================================

  for (const department of departments) {
    console.log(`📚 Processing: ${department.name}`);

    for (const course of courses) {
      for (const academicYear of academicYears) {
        // منع التكرار
        const existing = await prisma.courseOffering.findFirst({
          where: {
            courseId: course.id,
            departmentId: department.id,
            trackId: null,
            levelId: levelOne.id,
            termId: firstTerm.id,
            academicYearId: academicYear.id,
          },
        });

        if (existing) {
          continue;
        }

        await prisma.courseOffering.create({
          data: {
            courseId: course.id,
            departmentId: department.id,
            trackId: null,
            levelId: levelOne.id,
            termId: firstTerm.id,
            academicYearId: academicYear.id,
          },
        });
      }
    }
  }

  console.log('✅ Course offerings seeded');

  // ============================================================
  // Summary
  // ============================================================

  const totalOfferings = await prisma.courseOffering.count({
    where: {
      levelId: levelOne.id,
      termId: firstTerm.id,
      academicYearId: {
        in: academicYears.map((year) => year.id),
      },
      trackId: null,
    },
  });

  console.log('');
  console.log('==========================================');
  console.log('🎉 Academic seed completed successfully!');
  console.log('==========================================');
  console.log(`📚 Courses: ${courses.length}`);
  console.log(`🏫 Departments: ${departments.length}`);
  console.log(`📅 Academic Years: ${academicYears.length}`);
  console.log(`📖 Course Offerings: ${totalOfferings}`);
  console.log('==========================================');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
