import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Locale = "en-us" | "zh-cn";

type Binding = {
  namespace: string | null;
  file: string;
};

type BindingOccurrence = Binding & { pos: number };

const repoRoot = process.cwd();
const srcRoot = join(repoRoot, "src");
const messagesRoot = join(repoRoot, "messages");

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  });
}

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function hasPath(root: unknown, path: string[]): boolean {
  let cur: unknown = root;
  for (const part of path) {
    if (
      cur &&
      typeof cur === "object" &&
      part in (cur as Record<string, unknown>)
    ) {
      cur = (cur as Record<string, unknown>)[part];
      continue;
    }
    return false;
  }
  return true;
}

function normalizeKey(namespace: string | null, key: string): string {
  if (!namespace) return key;
  return `${namespace}.${key}`;
}

function extractBindings(
  source: string,
  file: string,
): Map<string, BindingOccurrence[]> {
  const bindings = new Map<string, BindingOccurrence[]>();

  function splitTopLevelCommaList(input: string): string[] {
    const parts: string[] = [];
    let buf = "";
    let depthParen = 0;
    let depthBracket = 0;
    let depthBrace = 0;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let isEscaped = false;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i] ?? "";
      if (isEscaped) {
        buf += ch;
        isEscaped = false;
        continue;
      }
      if (ch === "\\") {
        buf += ch;
        isEscaped = true;
        continue;
      }

      if (!inDouble && !inTemplate && ch === "'") {
        inSingle = !inSingle;
        buf += ch;
        continue;
      }
      if (!inSingle && !inTemplate && ch === '"') {
        inDouble = !inDouble;
        buf += ch;
        continue;
      }
      if (!inSingle && !inDouble && ch === "`") {
        inTemplate = !inTemplate;
        buf += ch;
        continue;
      }

      if (inSingle || inDouble || inTemplate) {
        buf += ch;
        continue;
      }

      if (ch === "(") depthParen++;
      else if (ch === ")") depthParen = Math.max(0, depthParen - 1);
      else if (ch === "[") depthBracket++;
      else if (ch === "]") depthBracket = Math.max(0, depthBracket - 1);
      else if (ch === "{") depthBrace++;
      else if (ch === "}") depthBrace = Math.max(0, depthBrace - 1);

      if (
        ch === "," &&
        depthParen === 0 &&
        depthBracket === 0 &&
        depthBrace === 0
      ) {
        const trimmed = buf.trim();
        if (trimmed.length > 0) parts.push(trimmed);
        buf = "";
        continue;
      }

      buf += ch;
    }

    const trimmed = buf.trim();
    if (trimmed.length > 0) parts.push(trimmed);
    return parts;
  }

  const patterns: Array<{
    regex: RegExp;
    namespaceGroup: number;
    varGroup: number;
  }> = [
    {
      regex:
        /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\s*\(\s*["']([^"']+)["']\s*\)/g,
      varGroup: 1,
      namespaceGroup: 2,
    },
    {
      regex:
        /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+getTranslations\s*\(\s*["']([^"']+)["']\s*\)/g,
      varGroup: 1,
      namespaceGroup: 2,
    },
    {
      regex:
        /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*getTranslations\s*\(\s*["']([^"']+)["']\s*\)/g,
      varGroup: 1,
      namespaceGroup: 2,
    },
  ];

  for (const { regex, namespaceGroup, varGroup } of patterns) {
    for (const match of source.matchAll(regex)) {
      const varName = match[varGroup];
      const namespace = match[namespaceGroup] ?? null;
      if (!varName) continue;
      const pos = match.index ?? 0;
      const list = bindings.get(varName) ?? [];
      list.push({ namespace, file, pos });
      bindings.set(varName, list);
    }
  }

  // const [a, b, t, ...] = await Promise.all([exprA, exprB, getTranslations("ns"), ...])
  const promiseAllRegex =
    /\bconst\s+\[([\s\S]*?)\]\s*=\s*await\s+Promise\.all\s*\(\s*\[([\s\S]*?)\]\s*\)/g;
  for (const match of source.matchAll(promiseAllRegex)) {
    const basePos = match.index ?? 0;
    const varsRaw = match[1] ?? "";
    const exprsRaw = match[2] ?? "";
    const vars = splitTopLevelCommaList(varsRaw);
    const exprs = splitTopLevelCommaList(exprsRaw);
    const len = Math.min(vars.length, exprs.length);
    for (let i = 0; i < len; i++) {
      const varToken = vars[i]?.trim();
      const exprToken = exprs[i]?.trim();
      if (!varToken || !exprToken) continue;
      if (varToken === "") continue;
      if (varToken === "" || varToken === "," || varToken === "_") continue;
      if (varToken === "") continue;
      // Skip holes: ", ,"
      if (varToken === "") continue;
      // Only bind simple identifiers
      if (!/^[A-Za-z_$][\w$]*$/.test(varToken)) continue;
      const m = exprToken.match(
        /\bgetTranslations\s*\(\s*["']([^"']+)["']\s*\)/,
      );
      if (!m) continue;
      const ns = m[1];
      if (!ns) continue;
      const list = bindings.get(varToken) ?? [];
      list.push({ namespace: ns, file, pos: basePos });
      bindings.set(varToken, list);
    }
  }

  return bindings;
}

function extractKeysFromFile(filePath: string): Set<string> {
  const source = readFileSync(filePath, "utf8");
  const bindings = extractBindings(source, filePath);

  const keys = new Set<string>();

  // 1) Bound translator calls like t("key") / t.rich("key")
  for (const [varName, occurrences] of bindings) {
    const sorted = occurrences.toSorted((a, b) => a.pos - b.pos);
    const callRegex = new RegExp(
      String.raw`\b${varName}\s*\(\s*["']([^"']+)["']\s*[,)]`,
      "g",
    );
    const richRegex = new RegExp(
      String.raw`\b${varName}\s*\.rich\s*\(\s*["']([^"']+)["']\s*[,)]`,
      "g",
    );
    function resolveNamespace(pos: number): string | null {
      let ns: string | null = null;
      for (const occ of sorted) {
        if (occ.pos <= pos) ns = occ.namespace;
        else break;
      }
      return ns;
    }

    for (const match of source.matchAll(callRegex)) {
      const key = match[1];
      if (!key) continue;
      const ns = resolveNamespace(match.index ?? 0);
      if (!ns) continue;
      keys.add(normalizeKey(ns, key));
    }
    for (const match of source.matchAll(richRegex)) {
      const key = match[1];
      if (!key) continue;
      const ns = resolveNamespace(match.index ?? 0);
      if (!ns) continue;
      keys.add(normalizeKey(ns, key));
    }
  }

  // 2) useTranslations("ns")("key") inline usage
  const inlineUseTranslationsRegex =
    /\buseTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*\(\s*["']([^"']+)["']\s*[,)]/g;
  for (const match of source.matchAll(inlineUseTranslationsRegex)) {
    const ns = match[1];
    const key = match[2];
    if (!ns || !key) continue;
    keys.add(normalizeKey(ns, key));
  }

  // 3) getTranslations("ns")("key") inline usage (server)
  const inlineGetTranslationsRegex =
    /\bgetTranslations\s*\(\s*["']([^"']+)["']\s*\)\s*\(\s*["']([^"']+)["']\s*[,)]/g;
  for (const match of source.matchAll(inlineGetTranslationsRegex)) {
    const ns = match[1];
    const key = match[2];
    if (!ns || !key) continue;
    keys.add(normalizeKey(ns, key));
  }

  return keys;
}

const files = walk(srcRoot).filter((p) => /\.(ts|tsx)$/.test(p));
const usedKeys = new Set<string>();

for (const file of files) {
  for (const key of extractKeysFromFile(file)) {
    usedKeys.add(key);
  }
}

const locales: Locale[] = ["en-us", "zh-cn"];
const messageTrees = new Map<Locale, unknown>(
  locales.map((locale) => [
    locale,
    readJson(join(messagesRoot, `${locale}.json`)),
  ]),
);

const missingByLocale = new Map<Locale, string[]>(
  locales.map((locale) => [locale, []]),
);

for (const key of Array.from(usedKeys).sort()) {
  const path = key.split(".").filter(Boolean);
  for (const locale of locales) {
    const tree = messageTrees.get(locale);
    if (!hasPath(tree, path)) {
      missingByLocale.get(locale)?.push(key);
    }
  }
}

let hasMissing = false;
for (const locale of locales) {
  const missing = missingByLocale.get(locale) ?? [];
  if (missing.length === 0) continue;
  hasMissing = true;
  console.error(`\nMissing messages in ${locale} (${missing.length}):`);
  for (const key of missing) console.error(`- ${key}`);
}

if (hasMissing) {
  process.exit(1);
}

console.log(
  `i18n key check passed. Scanned ${files.length} files, ${usedKeys.size} keys.`,
);
