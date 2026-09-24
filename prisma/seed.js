const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const grades = [
  { name: "Pre-Primary", code: "PRE_PRIMARY", level: 0, stage: "PRE_PRIMARY" },
  { name: "Standard I", code: "STANDARD_I", level: 1, stage: "PRIMARY" },
  { name: "Standard II", code: "STANDARD_II", level: 2, stage: "PRIMARY" },
  { name: "Standard III", code: "STANDARD_III", level: 3, stage: "PRIMARY" },
  { name: "Standard IV", code: "STANDARD_IV", level: 4, stage: "PRIMARY" },
  { name: "Standard V", code: "STANDARD_V", level: 5, stage: "PRIMARY" },
  { name: "Standard VI", code: "STANDARD_VI", level: 6, stage: "PRIMARY" },
];

const subjects = [
  { name: "Mathematics", code: "MATHEMATICS", icon: "calculator" },
  { name: "English", code: "ENGLISH", icon: "book-open" },
  { name: "Kiswahili", code: "KISWAHILI", icon: "languages" },
  { name: "Science", code: "SCIENCE", icon: "flask-conical" },
  { name: "Social Studies", code: "SOCIAL_STUDIES", icon: "map" },
];

const topicsBySubject = {
  MATHEMATICS: [
    { name: "Counting", code: "COUNTING" },
    { name: "Addition", code: "ADDITION" },
    { name: "Subtraction", code: "SUBTRACTION" },
    { name: "Multiplication", code: "MULTIPLICATION" },
    { name: "Fractions", code: "FRACTIONS" },
  ],
  ENGLISH: [
    { name: "Letters", code: "LETTERS" },
    { name: "Vocabulary", code: "VOCABULARY" },
    { name: "Reading", code: "READING" },
  ],
  KISWAHILI: [
    { name: "Herufi", code: "HERUFI" },
    { name: "Msamiati", code: "MSAMIATI" },
    { name: "Kusoma", code: "KUSOMA" },
  ],
  SCIENCE: [
    { name: "Living Things", code: "LIVING_THINGS" },
    { name: "Health", code: "HEALTH" },
  ],
  SOCIAL_STUDIES: [
    { name: "Family", code: "FAMILY" },
    { name: "Environment", code: "ENVIRONMENT" },
  ],
};

const gameTypes = [
  { name: "Multiple Choice", code: "MULTIPLE_CHOICE" },
  { name: "True / False", code: "TRUE_FALSE" },
  { name: "Image Choice", code: "IMAGE_CHOICE" },
  { name: "Matching", code: "MATCHING" },
  { name: "Drag and Drop", code: "DRAG_AND_DROP" },
  { name: "Fill in the Blank", code: "FILL_IN_THE_BLANK" },
  { name: "Ordering", code: "ORDERING" },
  { name: "Memory", code: "MEMORY" },
];

const crossCuttingThemes = [
  { name: "Health", code: "HEALTH" },
  { name: "Environment", code: "ENVIRONMENT" },
  { name: "Child Rights", code: "CHILD_RIGHTS" },
  { name: "Safety", code: "SAFETY" },
  { name: "Road Safety", code: "ROAD_SAFETY" },
  { name: "Financial Education", code: "FINANCIAL_EDUCATION" },
  { name: "Peace", code: "PEACE" },
  { name: "Citizenship", code: "CITIZENSHIP" },
  { name: "Gender", code: "GENDER" },
];

async function main() {
  const curriculum = await prisma.curriculumVersion.upsert({
    where: { code: "TZ_PRIMARY_CURRENT" },
    update: { active: true },
    create: {
      name: "Tanzania Primary Curriculum",
      code: "TZ_PRIMARY_CURRENT",
      description: "Current curriculum structure used by the educational game.",
      active: true,
    },
  });

  for (const grade of grades) {
    await prisma.grade.upsert({
      where: {
        curriculumVersionId_code: {
          curriculumVersionId: curriculum.id,
          code: grade.code,
        },
      },
      update: grade,
      create: {
        ...grade,
        curriculumVersionId: curriculum.id,
      },
    });
  }

  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { code: subject.code },
      update: subject,
      create: subject,
    });
  }

  for (const gameType of gameTypes) {
    await prisma.gameType.upsert({
      where: { code: gameType.code },
      update: gameType,
      create: gameType,
    });
  }

  for (const theme of crossCuttingThemes) {
    await prisma.crossCuttingTheme.upsert({
      where: { code: theme.code },
      update: theme,
      create: theme,
    });
  }

  const imageCategories = [
    { name: "fruits" },
    { name: "animals" },
  ];

  for (const imageCategory of imageCategories) {
    await prisma.imageCategory.upsert({
      where: { name: imageCategory.name },
      update: imageCategory,
      create: imageCategory,
    });
  }

  const savedGrades = await prisma.grade.findMany({
    where: { curriculumVersionId: curriculum.id },
  });
  const savedSubjects = await prisma.subject.findMany();

  for (const grade of savedGrades) {
    for (const subject of savedSubjects) {
      if (grade.code === "PRE_PRIMARY" && !["MATHEMATICS", "ENGLISH", "KISWAHILI"].includes(subject.code)) {
        continue;
      }

      const gradeSubject = await prisma.gradeSubject.upsert({
        where: {
          gradeId_subjectId: {
            gradeId: grade.id,
            subjectId: subject.id,
          },
        },
        update: { active: true },
        create: {
          gradeId: grade.id,
          subjectId: subject.id,
          active: true,
        },
      });

      const topicDefinitions = topicsBySubject[subject.code] || [];

      for (const topicDefinition of topicDefinitions) {
        const topic = await prisma.topic.upsert({
          where: {
            subjectId_code: {
              subjectId: subject.id,
              code: topicDefinition.code,
            },
          },
          update: topicDefinition,
          create: {
            ...topicDefinition,
            subjectId: subject.id,
          },
        });

        const placement = await prisma.gradeSubjectTopic.upsert({
          where: {
            gradeSubjectId_topicId: {
              gradeSubjectId: gradeSubject.id,
              topicId: topic.id,
            },
          },
          update: { active: true },
          create: {
            gradeSubjectId: gradeSubject.id,
            topicId: topic.id,
            active: true,
          },
        });

        for (const levelNumber of [1, 2, 3]) {
          await prisma.gameLevel.upsert({
            where: {
              gradeSubjectId_levelNumber: {
                gradeSubjectId: gradeSubject.id,
                levelNumber,
              },
            },
            update: {
              name: `Level ${levelNumber}`,
              active: true,
            },
            create: {
              gradeSubjectId: gradeSubject.id,
              levelNumber,
              name: `Level ${levelNumber}`,
              difficulty: levelNumber === 1 ? "EASY" : levelNumber === 2 ? "MEDIUM" : "HARD",
              requiredPoints: (levelNumber - 1) * 50,
              timeLimit: 30,
              active: true,
            },
          });
        }
      }
    }
  }

  const prePrimaryMath = await prisma.gradeSubject.findFirst({
    where: {
      grade: { code: "PRE_PRIMARY" },
      subject: { code: "MATHEMATICS" },
    },
    include: {
      levels: true,
      topics: {
        include: {
          topic: true,
        },
      },
    },
  });

  if (prePrimaryMath) {
    const level1 = prePrimaryMath.levels.find((level) => level.levelNumber === 1);
    const countingTopic = prePrimaryMath.topics.find((placement) => placement.topic.code === "COUNTING")?.topic;
    const multipleChoice = await prisma.gameType.findUnique({ where: { code: "MULTIPLE_CHOICE" } });
    const trueFalse = await prisma.gameType.findUnique({ where: { code: "TRUE_FALSE" } });
    const matching = await prisma.gameType.findUnique({ where: { code: "MATCHING" } });
    const ordering = await prisma.gameType.findUnique({ where: { code: "ORDERING" } });
    const fillInTheBlank = await prisma.gameType.findUnique({ where: { code: "FILL_IN_THE_BLANK" } });

    if (level1 && countingTopic && multipleChoice && trueFalse && matching && ordering && fillInTheBlank) {
      const seedQuestions = [
        {
          text: "2 + 2 equals?",
          gameTypeId: multipleChoice.id,
          topicId: countingTopic.id,
          explanation: "Two plus two makes four.",
          options: [
            { text: "3", isCorrect: false, order: 0 },
            { text: "4", isCorrect: true, order: 1 },
            { text: "5", isCorrect: false, order: 2 },
          ],
        },
        {
          text: "A triangle has three sides.",
          gameTypeId: trueFalse.id,
          topicId: countingTopic.id,
          explanation: "Triangles always have three sides.",
          trueFalse: { create: { answer: true } },
        },
        {
          text: "Match the number to the word.",
          gameTypeId: matching.id,
          topicId: countingTopic.id,
          explanation: "Match each numeral with its name.",
          matches: [
            { leftText: "1", rightText: "One", order: 0 },
            { leftText: "2", rightText: "Two", order: 1 },
          ],
        },
        {
          text: "Put the numbers in order.",
          gameTypeId: ordering.id,
          topicId: countingTopic.id,
          explanation: "Start from the smallest number.",
          orderingItems: [
            { text: "1", correctOrder: 0 },
            { text: "2", correctOrder: 1 },
            { text: "3", correctOrder: 2 },
          ],
        },
        {
          text: "Fill in the blank: 1, 2, __",
          gameTypeId: fillInTheBlank.id,
          topicId: countingTopic.id,
          explanation: "The next number is 3.",
          acceptedAnswers: [
            { answer: "3", isCaseSensitive: false },
          ],
        },
      ];

      for (const question of seedQuestions) {
        const existingQuestion = await prisma.question.findFirst({
          where: {
            gameLevelId: level1.id,
            gameTypeId: question.gameTypeId,
            text: question.text,
          },
        });

        if (existingQuestion) {
          continue;
        }

        await prisma.question.create({
          data: {
            gameLevelId: level1.id,
            topicId: question.topicId,
            gameTypeId: question.gameTypeId,
            text: question.text,
            explanation: question.explanation,
            points: 10,
            timeLimit: 30,
            active: true,
            options: question.options
              ? {
                  create: question.options,
                }
              : undefined,
            trueFalse: question.trueFalse,
            matches: question.matches
              ? {
                  create: question.matches,
                }
              : undefined,
            orderingItems: question.orderingItems
              ? {
                  create: question.orderingItems,
                }
              : undefined,
            acceptedAnswers: question.acceptedAnswers
              ? {
                  create: question.acceptedAnswers,
                }
              : undefined,
          },
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
