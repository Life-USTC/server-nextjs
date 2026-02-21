import { findCurrentSemester } from "@/lib/current-semester";
import { prisma } from "@/lib/prisma";

/**
 * Debug script to check if section codes exist in the database
 */
async function checkSectionCodes() {
  const codes = [
    "CONT6209P.01",
    "CONT6403P.01",
    "CONT6407P.01",
    "FORL6102U.23",
    "INTE6403Q.01",
    "MARX6102U.21",
    "PHIL6101U.13",
  ];

  try {
    console.log("Checking section codes in database...\n");

    // Get current semester based on today's date
    const currentSemester = await findCurrentSemester(prisma.semester);

    console.log(
      `Current semester: ${currentSemester?.nameCn} (ID: ${currentSemester?.id})\n`,
    );

    for (const code of codes) {
      console.log(`\nChecking code: ${code}`);

      // Check all semesters
      const allMatches = await prisma.section.findMany({
        where: { code },
        include: {
          semester: true,
          course: true,
        },
      });

      if (allMatches.length === 0) {
        console.log(`  ❌ Not found in any semester`);
      } else {
        console.log(`  ✓ Found in ${allMatches.length} semester(s):`);
        for (const match of allMatches) {
          console.log(
            `    - ${match.semester?.nameCn || "Unknown"} | ${match.course.nameCn}`,
          );
        }
      }

      // Check current semester specifically
      const currentMatch = await prisma.section.findFirst({
        where: {
          code,
          semesterId: currentSemester?.id,
        },
      });

      if (currentMatch) {
        console.log(`  ✓ EXISTS in current semester`);
      } else {
        console.log(`  ❌ NOT in current semester`);
      }
    }

    // Also check similar codes
    console.log("\n\n=== Checking for similar codes ===");
    const pattern = codes[0].substring(0, 8); // e.g., "CONT6209"
    console.log(`Looking for codes starting with: ${pattern}`);

    const similar = await prisma.section.findMany({
      where: {
        code: {
          startsWith: pattern,
        },
      },
      include: {
        semester: true,
      },
      take: 10,
    });

    console.log(`\nFound ${similar.length} similar codes:`);
    for (const s of similar) {
      console.log(`  ${s.code} | ${s.semester?.nameCn || "Unknown"}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSectionCodes();
