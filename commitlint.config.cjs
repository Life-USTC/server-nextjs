const scopedTypes = new Set(["build", "ci", "docs", "feat", "fix", "perf", "refactor", "test"]);
const documentedScopes = new Set(["api", "auth"]);

function matchesScope(scope) {
  return /^[a-z0-9][a-z0-9/-]*$/.test(scope);
}

module.exports = {
  extends: ["@commitlint/config-conventional"],
  defaultIgnores: true,
  plugins: [
    {
      rules: {
        "scope-required-for-type": (parsed) => {
          const type = parsed.type ?? "";
          const scope = parsed.scope ?? "";

          if (!scopedTypes.has(type)) {
            return [true];
          }

          return [
            scope.length > 0,
            `type "${type}" requires a scope, for example "${type}(api): ..."`,
          ];
        },
        "scope-format": (parsed) => {
          const scope = parsed.scope ?? "";

          if (scope.length === 0) {
            return [true];
          }

          return [
            matchesScope(scope),
            "scope must be lowercase and may contain digits, hyphens, or slashes",
          ];
        },
        "subject-no-pr-suffix": (parsed) => {
          const subject = parsed.subject ?? "";

          return [
            !/\s\(#\d+\)$/.test(subject),
            "do not append PR numbers to the subject; use a footer like 'Refs: #123' instead",
          ];
        },
        "body-required-for-documented-change": (parsed) => {
          const type = parsed.type ?? "";
          const scope = parsed.scope ?? "";
          const body = (parsed.body ?? "").trim();

          if (!(documentedScopes.has(scope) && (type === "feat" || type === "fix"))) {
            return [true];
          }

          return [
            body.length > 0,
            `commits like "${type}(${scope}): ..." must include a body describing the behavior or contract change`,
          ];
        },
        "body-required-for-breaking-change": (parsed) => {
          const raw = parsed.raw ?? "";
          const body = (parsed.body ?? "").trim();
          const hasBreakingHeader = /^[a-z]+(?:\([^)]+\))?!:/.test(parsed.header ?? "");
          const hasBreakingFooter = /(^|\n)BREAKING CHANGE: .+/m.test(raw) || /(^|\n)BREAKING-CHANGE: .+/m.test(raw);

          if (!(hasBreakingHeader || hasBreakingFooter)) {
            return [true];
          }

          return [
            body.length > 0,
            "breaking changes must include a body explaining the migration or behavior impact",
          ];
        },
        "breaking-change-footer-required": (parsed) => {
          const raw = parsed.raw ?? "";
          const hasBreakingHeader = /^[a-z]+(?:\([^)]+\))?!:/.test(parsed.header ?? "");
          const hasBreakingFooter = /(^|\n)BREAKING CHANGE: .+/m.test(raw) || /(^|\n)BREAKING-CHANGE: .+/m.test(raw);

          if (!hasBreakingHeader) {
            return [true];
          }

          return [
            hasBreakingFooter,
            'commits using "!" in the header must include a "BREAKING CHANGE:" footer',
          ];
        },
      },
    },
  ],
  rules: {
    "body-leading-blank": [1, "always"],
    "body-required-for-breaking-change": [2, "always"],
    "body-required-for-documented-change": [2, "always"],
    "breaking-change-footer-required": [2, "always"],
    "footer-leading-blank": [1, "always"],
    "header-max-length": [2, "always", 100],
    "scope-format": [2, "always"],
    "scope-required-for-type": [2, "always"],
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "subject-no-pr-suffix": [2, "always"],
    "type-enum": [
      2,
      "always",
      ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "test"],
    ],
  },
};
