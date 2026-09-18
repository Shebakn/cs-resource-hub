import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting academic seed...');

  // ============================================================
  // Departments
  // ============================================================

  const departmentNames = ['امن معلومات', 'علوم حاسوب', 'تقنية معلومات'];

  const departments: Array<{
    id: number;
    name: string;
  }> = [];

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
      name: 'المستوى الاول',
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

  const levelThree = await prisma.level.findUnique({
    where: {
      number: 3,
    },
  });

  if (!levelOne) {
    throw new Error('❌ المستوى الاول غير موجود');
  }

  if (!levelThree) {
    throw new Error('❌ المستوى الثالث غير موجود');
  }

  console.log('✅ Levels seeded');

  // ============================================================
  // Terms
  // ============================================================

  const terms = [
    {
      number: 1,
      name: 'الترم الاول',
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
    throw new Error('❌ الترم الاول غير موجود');
  }

  console.log('✅ Terms seeded');

  // ============================================================
  // Academic Years
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

  const levelOneCourseNames = [
    'مقدمة في علوم الحاسوب',
    'برمجة حاسب 1',
    'هياكل متقطعة للحوسبة',
    'حساب التفاضل',
    'اللغة الإنجليزية 1',
    'اللغة العربية 1',
    'الثقافة الإسلامية 1',
  ];

  const levelOneCourses: Array<{
    id: number;
    name: string;
    code: string | null;
  }> = [];

  for (const name of levelOneCourseNames) {
    const course = await prisma.course.findFirst({
      where: {
        name,
      },
    });

    if (course) {
      levelOneCourses.push(course);
    } else {
      const newCourse = await prisma.course.create({
        data: {
          name,
        },
      });

      levelOneCourses.push(newCourse);
    }
  }

  console.log(`✅ ${levelOneCourses.length} level 1 courses created/found`);

  // ============================================================
  // Level 1 Course Offerings
  //
  // 3 Departments
  // × 7 Courses
  // × 2 Academic Years
  // = 42 Offerings
  // ============================================================

  for (const department of departments) {
    console.log(`📚 Processing Level 1: ${department.name}`);

    for (const course of levelOneCourses) {
      for (const academicYear of academicYears) {
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

  console.log('✅ Level 1 Course offerings seeded');

  // ============================================================
  // Level 3 / أمن معلومات / Term 1
  // ============================================================

  const informationSecurityDepartment = await prisma.department.findUnique({
    where: {
      name: 'امن معلومات',
    },
  });

  if (!informationSecurityDepartment) {
    throw new Error('❌ تخصص امن معلومات غير موجود');
  }

  const levelThreeCourseNames = [
    'هندسة البرمجيات',
    'اساسيات شبكات الحاسب',
    'اساسيات نظم قواعد البيانات',
    'اساسيات علم الاحصاء',
    'الكتابة الاكاديمية',
    'اخلاقيات الحاسوب',
  ];

  const levelThreeCourses: Array<{
    id: number;
    name: string;
    code: string | null;
  }> = [];

  for (const name of levelThreeCourseNames) {
    const course = await prisma.course.findFirst({
      where: {
        name,
      },
    });

    if (course) {
      levelThreeCourses.push(course);
    } else {
      const newCourse = await prisma.course.create({
        data: {
          name,
        },
      });

      levelThreeCourses.push(newCourse);
    }
  }

  // ============================================================
  // Level 1 / Term 2 Courses
  // ============================================================

  const secondTerm = await prisma.term.findUnique({
    where: {
      number: 2,
    },
  });

  if (!secondTerm) {
    throw new Error('❌ الترم الثاني غير موجود');
  }

  const levelOneTermTwoCourseNames = [
    'الفيزياء العامة',
    'برمجة حاسب 2',
    'حساب التكامل',
    'اللغة العربية 2',
    'اللغة الانجليزية 2',
    'الثقافة الاسلامية 2',
  ];

  const levelOneTermTwoCourses: Array<{
    id: number;
    name: string;
    code: string | null;
  }> = [];

  for (const name of levelOneTermTwoCourseNames) {
    const course = await prisma.course.findFirst({
      where: {
        name,
      },
    });

    if (course) {
      levelOneTermTwoCourses.push(course);
    } else {
      const newCourse = await prisma.course.create({
        data: {
          name,
        },
      });

      levelOneTermTwoCourses.push(newCourse);
    }
  }

  console.log(
    `✅ ${levelOneTermTwoCourses.length} level 1 term 2 courses created/found`,
  );

  // ============================================================
  // Level 1 / Term 2 Course Offerings
  //
  // 3 Departments
  // × 6 Courses
  // × 2 Academic Years
  // = 36 Offerings
  //
  // بدون Track
  // ============================================================

  for (const department of departments) {
    console.log(`📚 Processing Level 1 / Term 2: ${department.name}`);

    for (const course of levelOneTermTwoCourses) {
      for (const academicYear of academicYears) {
        const existing = await prisma.courseOffering.findFirst({
          where: {
            courseId: course.id,
            departmentId: department.id,
            trackId: null,
            levelId: levelOne.id,
            termId: secondTerm.id,
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
            termId: secondTerm.id,
            academicYearId: academicYear.id,
          },
        });
      }
    }
  }

  console.log('✅ Level 1 Term 2 Course offerings seeded');

  const departmentSpecificLevelOneTermTwoCourses = [
    {
      departmentName: 'تقنية معلومات',
      courseName: 'اساسيات تقنية معلومات',
    },
    {
      departmentName: 'امن معلومات',
      courseName: 'اساسيات امن المعلومات',
    },
    {
      departmentName: 'علوم حاسوب',
      courseName: 'اساسيات علوم الحاسوب',
    },
  ];

  for (const item of departmentSpecificLevelOneTermTwoCourses) {
    const department = departments.find(
      (department) => department.name === item.departmentName,
    );

    if (!department) {
      throw new Error(`❌ التخصص غير موجود: ${item.departmentName}`);
    }

    let course = await prisma.course.findFirst({
      where: {
        name: item.courseName,
      },
    });

    if (!course) {
      course = await prisma.course.create({
        data: {
          name: item.courseName,
        },
      });
    }

    console.log(`📚 ${department.name} → ${course.name}`);

    for (const academicYear of academicYears) {
      const existing = await prisma.courseOffering.findFirst({
        where: {
          courseId: course.id,
          departmentId: department.id,
          trackId: null,
          levelId: levelOne.id,
          termId: secondTerm.id,
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
          termId: secondTerm.id,
          academicYearId: academicYear.id,
        },
      });
    }
  }

  console.log('✅ Department-specific Level 1 Term 2 courses seeded');

  console.log(`✅ ${levelThreeCourses.length} level 3 courses created/found`);

  // ============================================================
  // Level 3 Course Offerings
  //
  // 1 Department
  // × 6 Courses
  // × 2 Academic Years
  // = 12 Offerings
  //
  // امن معلومات
  // المستوى الثالث
  // الترم الاول
  // بدون Track
  // ============================================================

  for (const course of levelThreeCourses) {
    for (const academicYear of academicYears) {
      const existing = await prisma.courseOffering.findFirst({
        where: {
          courseId: course.id,
          departmentId: informationSecurityDepartment.id,
          trackId: null,
          levelId: levelThree.id,
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
          departmentId: informationSecurityDepartment.id,
          trackId: null,
          levelId: levelThree.id,
          termId: firstTerm.id,
          academicYearId: academicYear.id,
        },
      });
    }
  }

  console.log('✅ Level 3 Information Security Course offerings seeded');

  // ============================================================
  // Summary
  // ============================================================

  // ============================================================
  // Level 2 / امن معلومات / Term 1
  // ============================================================

  const levelTwo = await prisma.level.findUnique({
    where: {
      number: 2,
    },
  });

  if (!levelTwo) {
    throw new Error('❌ المستوى الثاني غير موجود');
  }

  const levelTwoCourseNames = [
    'التشفير',
    'البرمجة الموجهه',
    'هياكل البيانات',
    'مهارات الحاسوب',
    'معمارية وتنظيم الحاسوب',
    'اللغة الانجليزية للعلوم',
  ];

  const levelTwoCourses: Array<{
    id: number;
    name: string;
    code: string | null;
  }> = [];

  for (const name of levelTwoCourseNames) {
    const course = await prisma.course.findFirst({
      where: {
        name,
      },
    });

    if (course) {
      levelTwoCourses.push(course);
    } else {
      const newCourse = await prisma.course.create({
        data: {
          name,
        },
      });

      levelTwoCourses.push(newCourse);
    }
  }

  console.log(`✅ ${levelTwoCourses.length} level 2 courses created/found`);

  // ============================================================
  // Level 2 Course Offerings
  //
  // امن معلومات
  // المستوى الثاني
  // الترم الاول
  // بدون Track
  // 6 Courses × 2 Academic Years = 12 Offerings
  // ============================================================

  for (const course of levelTwoCourses) {
    for (const academicYear of academicYears) {
      const existing = await prisma.courseOffering.findFirst({
        where: {
          courseId: course.id,
          departmentId: informationSecurityDepartment.id,
          trackId: null,
          levelId: levelTwo.id,
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
          departmentId: informationSecurityDepartment.id,
          trackId: null,
          levelId: levelTwo.id,
          termId: firstTerm.id,
          academicYearId: academicYear.id,
        },
      });
    }
  }

  console.log('✅ Level 2 Information Security Course offerings seeded');

  // ============================================================
  // Level 4 / امن معلومات / Term 1
  // ============================================================

  const levelFour = await prisma.level.findUnique({
    where: {
      number: 4,
    },
  });

  if (!levelFour) {
    throw new Error('❌ المستوى الرابع غير موجود');
  }

  const levelFourCourseNames = ['امن الانضمة المعلوماتية', 'الاختراق الاخلاقي'];

  const levelFourCourses: Array<{
    id: number;
    name: string;
    code: string | null;
  }> = [];

  for (const name of levelFourCourseNames) {
    const course = await prisma.course.findFirst({
      where: {
        name,
      },
    });

    if (course) {
      levelFourCourses.push(course);
    } else {
      const newCourse = await prisma.course.create({
        data: {
          name,
        },
      });

      levelFourCourses.push(newCourse);
    }
  }

  console.log(`✅ ${levelFourCourses.length} level 4 courses created/found`);

  // ============================================================
  // Level 4 Course Offerings
  //
  // امن معلومات
  // المستوى الرابع
  // الترم الاول
  // بدون Track
  // 2 Courses × 2 Academic Years = 4 Offerings
  // ============================================================

  for (const course of levelFourCourses) {
    for (const academicYear of academicYears) {
      const existing = await prisma.courseOffering.findFirst({
        where: {
          courseId: course.id,
          departmentId: informationSecurityDepartment.id,
          trackId: null,
          levelId: levelFour.id,
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
          departmentId: informationSecurityDepartment.id,
          trackId: null,
          levelId: levelFour.id,
          termId: firstTerm.id,
          academicYearId: academicYear.id,
        },
      });
    }
  }

  console.log('✅ Level 4 Information Security Course offerings seeded');

  const totalOfferings = await prisma.courseOffering.count();

  console.log('');
  console.log('==========================================');
  console.log('🎉 Academic seed completed successfully!');
  console.log('==========================================');
  console.log(`🏫 Departments: ${departments.length}`);
  console.log(`📅 Academic Years: ${academicYears.length}`);
  console.log(`📚 Level 1 Courses: ${levelOneCourses.length}`);
  console.log(`📚 Level 3 Courses: ${levelThreeCourses.length}`);
  console.log(`📖 Total Course Offerings: ${totalOfferings}`);
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
