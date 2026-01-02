import { writeFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";

/**
 * Dumps all section codes from the database to a text file
 */
async function dumpSectionCodes() {
  try {
    console.log("Fetching section codes from database...");

    // Fetch all sections with their codes
    const sections = await prisma.section.findMany({
      select: {
        code: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    console.log(`Found ${sections.length} sections`);

    // Extract codes and join with newlines
    const codes = sections.map((s) => s.code).join("\n");

    // Write to file
    const outputPath = "section-codes.txt";
    await writeFile(outputPath, codes, "utf-8");

    console.log(`✓ Section codes dumped to ${outputPath}`);
    console.log(`Total sections: ${sections.length}`);
  } catch (error) {
    console.error("Error dumping section codes:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
dumpSectionCodes();
