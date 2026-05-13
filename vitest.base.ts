import fs from "node:fs";
import path from "node:path";

type TsConfigPaths = Record<string, string[]>;

function loadSharedAlias() {
  const tsconfig = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "tsconfig.json"), "utf8"),
  ) as {
    compilerOptions?: {
      paths?: TsConfigPaths;
    };
  };

  const paths = tsconfig.compilerOptions?.paths ?? {};
  return Object.fromEntries(
    Object.entries(paths)
      .map(([alias, targets]) => {
        const target = targets[0];
        if (!target) {
          return null;
        }

        return [
          alias.replace(/\/\*$/, ""),
          path.resolve(__dirname, target.replace(/\/\*$/, "")),
        ];
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );
}

/** Path aliases shared between TypeScript and Vitest configs. */
export const sharedAlias = loadSharedAlias();
