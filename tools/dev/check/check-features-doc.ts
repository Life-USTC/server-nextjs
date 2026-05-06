import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { parse } from "yaml";

const featuresDir = "docs/features";
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

// Load and merge modular feature files
if (!existsSync(featuresDir)) {
  console.error(`Features directory not found: ${featuresDir}`);
  process.exit(1);
}

const files = readdirSync(featuresDir).filter((f) => f.endsWith(".yml"));
if (files.length === 0) {
  console.error("No feature files found");
  process.exit(1);
}

console.log(`Found ${files.length} feature files`);

const metadataTargets = {
  "_meta.yml": "meta",
  "_product.yml": "product",
  "_models.yml": "models",
  "_enums.yml": "enums",
  "_ui.yml": "ui",
  "_cases.yml": "cases",
  "_audit.yml": "audit",
} as const;

// Merge all feature files
const merged: Record<string, unknown> & { modules: Record<string, unknown> } = {
  meta: {},
  product: {},
  models: {},
  enums: {},
  ui: {},
  modules: {},
  cases: {},
  audit: {},
};

for (const file of files.sort()) {
  const path = join(featuresDir, file);
  const content = readFileSync(path, "utf8");
  const data = parse(content);

  if (file.startsWith("_")) {
    const target = metadataTargets[file as keyof typeof metadataTargets];
    if (!target) {
      console.error(`Unknown metadata file: ${path}`);
      process.exit(1);
    }
    merged[target] = data;
    continue;
  }

  const moduleName = file.replace(".yml", "");
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    console.error(`Module file must contain a YAML object: ${path}`);
    process.exit(1);
  }
  merged.modules[moduleName] = data;
}

// Validate against schema
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

if (!validate(merged)) {
  console.error("Feature document schema validation failed:");
  for (const error of validate.errors ?? []) {
    console.error(
      `- ${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    );
  }
  process.exit(1);
}

// Validate Prisma sync
const expected = parsePrismaSchema(readFileSync(prismaPath, "utf8"));
const actual = { enums: merged.enums, models: merged.models };

if (stableJson(actual) !== stableJson(expected)) {
  console.error(
    "Feature document model metadata is out of sync with prisma/schema.prisma.",
  );
  process.exit(1);
}

console.log("✅ Features validate against schema and Prisma");
console.log(`   ${files.length} files merged successfully`);
