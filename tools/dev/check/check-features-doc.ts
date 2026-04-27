import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020";
import { parse } from "yaml";

const featuresPath = "docs/features.yml";
const schemaPath = "docs/features.schema.json";
const prismaPath = "prisma/schema.prisma";

type PrismaDocs = {
  enums: Record<string, string[]>;
  models: Record<
    string,
    { fields: Record<string, string>; constraints?: string[] }
  >;
};

function parsePrismaSchema(source: string): PrismaDocs {
  const enums: PrismaDocs["enums"] = {};
  for (const match of source.matchAll(/^enum\s+(\w+)\s*{([\s\S]*?)^}/gm)) {
    const [, name, body] = match;
    enums[name] = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//"));
  }

  const models: PrismaDocs["models"] = {};
  for (const match of source.matchAll(/^model\s+(\w+)\s*{([\s\S]*?)^}/gm)) {
    const [, name, body] = match;
    const fields: Record<string, string> = {};
    const constraints: string[] = [];

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) continue;
      if (line.startsWith("@@")) {
        constraints.push(line);
        continue;
      }

      const fieldMatch = line.match(/^(\w+)\s+(.+)$/);
      if (fieldMatch)
        fields[fieldMatch[1]] = fieldMatch[2].replace(/\s+/g, " ");
    }

    models[name] = constraints.length ? { fields, constraints } : { fields };
  }

  return { enums, models };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

const doc = parse(readFileSync(featuresPath, "utf8"));
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
if (!validate(doc)) {
  console.error("Feature document schema validation failed:");
  for (const error of validate.errors ?? []) {
    console.error(
      `- ${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    );
  }
  process.exit(1);
}

const expected = parsePrismaSchema(readFileSync(prismaPath, "utf8"));
const actual = { enums: doc.enums, models: doc.models };

if (stableJson(actual) !== stableJson(expected)) {
  console.error(
    "Feature document model metadata is out of sync with prisma/schema.prisma. Regenerate docs/features.yml models/enums from the Prisma schema.",
  );
  process.exit(1);
}

console.log(
  "features.yml validates against features.schema.json and prisma/schema.prisma",
);
