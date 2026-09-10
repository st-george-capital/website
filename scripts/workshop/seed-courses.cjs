// Add the new quant courses only. Existing courses and author edits are preserved.
require("@next/env").loadEnvConfig(process.cwd());
require("sucrase/register/ts");
const { PrismaClient } = require("@prisma/client");
const { quantCourses } = require("../../lib/learning/quant-courses.ts");
(async () => {
  if (!process.argv.includes("--apply")) {
    console.log(
      `${quantCourses.length} quant courses ready; use --apply to add missing courses.`,
    );
    return;
  }
  const p = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_PRISMA_DATABASE_URL || process.env.DATABASE_URL,
  });
  try {
    for (const [i, c] of quantCourses.entries()) {
      const existing = await p.learningCourse.findUnique({
        where: { slug: c.slug },
        select: { id: true },
      });
      if (existing) {
        console.log(`Preserved ${c.slug}`);
        continue;
      }
      const { lessons, ...data } = c;
      await p.learningCourse.create({
        data: {
          ...data,
          order: 20 + i,
          published: true,
          lessons: {
            create: lessons.map((l, j) => ({
              ...l,
              order: j,
              published: true,
            })),
          },
        },
      });
      console.log(`Added ${c.slug} (${lessons.length} lessons)`);
    }
  } finally {
    await p.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
