const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const translationsByEnglishText = new Map([
  ["2 + 2 =", { text: "2 + 2 = ?" }],
  ["image(1) + image(2) =", { text: "image(1) + image(2) = ?" }],
  ["1 + 1 = ?", { text: "1 + 1 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 2." }],
  ["1 + 2 = ?", { text: "1 + 2 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 3." }],
  ["2 + 1 = ?", { text: "2 + 1 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 3." }],
  ["4 + 1 = ?", { text: "4 + 1 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 5." }],
  ["7 + 1 = ?", { text: "7 + 1 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 8." }],
  ["7 + 2 = ?", { text: "7 + 2 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 9." }],
  ["8 + 1 = ?", { text: "8 + 1 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 9." }],
  ["8 + 2 = ?", { text: "8 + 2 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 10." }],
  ["9 + 1 = ?", { text: "9 + 1 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 10." }],
  ["9 + 2 = ?", { text: "9 + 2 = ?", explanation: "Hesabu vitu au jumlisha namba hizo mbili ili kupata 11." }],
  ["image(1) + image(1) image(1) =", { text: "image(1) + image(1) image(1) =" }],
  ["image(1) shows 4 apples. How many apples are there?", { text: "image(1) inaonyesha tufaha 4. Kuna tufaha mangapi?", explanation: "Hesabu tufaha nne." }],
  ["What is 6 + 3?", { text: "6 + 3 ni ngapi?", explanation: "6 ukijumlisha 3 ni 9." }],
  ["Look at image(1). Which number is one more than 7?", { text: "Tazama image(1). Ni namba gani inayofuata baada ya 7?", explanation: "Namba moja zaidi ya 7 ni 8." }],
  ["What is 10 - 4?", { text: "10 - 4 ni ngapi?", explanation: "10 ukitoa 4 ni 6." }],
  ["How many objects are shown in image(1)?", { text: "Ni vitu vingapi vinavyoonekana kwenye image(1)?", explanation: "Kuna vitu vinne vinavyoonekana." }],
  ["Is the group in image(1) made of four apples?", { text: "Je, kundi lililo kwenye image(1) lina tufaha manne?", explanation: "Picha inaonyesha tufaha manne." }],
  ["Is 5 + 2 equal to 7?", { text: "Je, 5 + 2 ni sawa na 7?", explanation: "5 ukijumlisha 2 ni 7." }],
  ["Is 9 less than 3?", { text: "Je, 9 ni ndogo kuliko 3?", explanation: "9 ni kubwa kuliko 3." }],
  ["Is image(1) showing more than ten objects?", { text: "Je, image(1) inaonyesha vitu zaidi ya kumi?", explanation: "Picha inaonyesha vitu vichache kuliko kumi." }],
  ["Is 12 - 5 equal to 7?", { text: "Je, 12 - 5 ni sawa na 7?", explanation: "12 ukitoa 5 ni 7." }],
  ["image(1) image(2)\nhow many fruits are there?", { text: "image(1) image(2)\nKuna matunda mangapi?" }],
  ["9+3=", { text: "9 + 3 = ?" }],
  ["2-0=", { text: "2 - 0 = ?" }],
  ["10+0=0", { text: "10 + 0 = 0" }],
  ["1+1=", { text: "1 + 1 = ?" }],
]);

const placeholderTexts = new Set(["Ut cupidatat ut expl"]);

async function main() {
  const questions = await prisma.question.findMany({
    where: {
      gameLevel: {
        gradeSubject: {
          subject: { code: "MATHEMATICS" },
        },
      },
    },
    include: {
      translations: true,
      options: { include: { translations: true } },
      matches: { include: { translations: true } },
      orderingItems: { include: { translations: true } },
      acceptedAnswers: true,
    },
  });

  const pending = questions.filter((question) =>
    !question.translations.some((translation) => translation.language === "SW")
      && !placeholderTexts.has(question.text),
  );
  const unknown = pending.filter((question) => !translationsByEnglishText.has(question.text));

  if (unknown.length > 0) {
    throw new Error(`Missing reviewed Kiswahili source for math question IDs: ${unknown.map(({ id }) => id).join(", ")}`);
  }

  const optionsPending = pending.reduce((total, question) => total + question.options.filter((option) =>
    option.text !== null && !option.translations.some((item) => item.language === "SW"),
  ).length, 0);

  if (!process.argv.includes("--apply")) {
    console.log(`Dry run: would add Kiswahili translations for ${pending.length} Mathematics questions and ${optionsPending} answer options.`);
    console.log(`Already translated questions preserved: ${questions.length - pending.length - placeholderTexts.size}.`);
    console.log(`Recognized placeholder questions left untranslated: ${placeholderTexts.size}.`);
    return;
  }

  let questionsAdded = 0;
  let optionsAdded = 0;
  await prisma.$transaction(async (transaction) => {
    for (const question of pending) {
      const translation = translationsByEnglishText.get(question.text);
      await transaction.questionTranslation.create({
        data: {
          questionId: question.id,
          language: "SW",
          text: translation.text,
          explanation: translation.explanation ?? null,
        },
      });
      questionsAdded += 1;

      for (const option of question.options) {
        if (option.text === null || option.translations.some((item) => item.language === "SW")) continue;
        await transaction.questionOptionTranslation.create({
          data: {
            questionOptionId: option.id,
            language: "SW",
            text: option.text,
          },
        });
        optionsAdded += 1;
      }

      for (const pair of question.matches) {
        if (pair.translations.some((item) => item.language === "SW")) continue;
        await transaction.questionMatchPairTranslation.create({
          data: {
            questionMatchPairId: pair.id,
            language: "SW",
            leftText: pair.leftText,
            rightText: pair.rightText,
          },
        });
      }

      for (const item of question.orderingItems) {
        if (item.translations.some((translationItem) => translationItem.language === "SW")) continue;
        await transaction.questionOrderingItemTranslation.create({
          data: {
            questionOrderingItemId: item.id,
            language: "SW",
            text: item.text,
          },
        });
      }

      for (const answer of question.acceptedAnswers) {
        if (answer.language === "SW") continue;
        await transaction.questionAcceptedAnswer.create({
          data: {
            questionId: question.id,
            language: "SW",
            answer: answer.answer,
            isCaseSensitive: answer.isCaseSensitive,
          },
        });
      }
    }
  });

  console.log(`Added Kiswahili translations for ${questionsAdded} Mathematics questions and ${optionsAdded} answer options.`);
  console.log(`Left ${placeholderTexts.size} recognized placeholder question untranslated.`);
  console.log(`Already translated questions preserved: ${questions.length - pending.length - placeholderTexts.size}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });