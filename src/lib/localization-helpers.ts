/**
 * Helper type for models that have both Chinese and English names
 */
export interface LocalizableNames {
  nameCn: string;
  nameEn?: string | null;
}

/**
 * Type helper to add localized properties to a type
 */
export type Localized<T> = T & {
  namePrimary: string;
  nameSecondary: string | undefined;
};

/**
 * Adds localized name properties (namePrimary and nameSecondary) to an object in place
 * Mutates the original object to add computed properties
 * @param obj Object with nameCn and optional nameEn fields
 * @param locale The current locale (e.g., 'en-us', 'zh-cn')
 * @returns The same object with added namePrimary and nameSecondary properties
 */
export function addLocalizedNames<T extends LocalizableNames>(
  obj: T,
  locale: string,
): Localized<T> {
  const isEnglish = locale === "en-us";

  Object.defineProperties(obj, {
    namePrimary: {
      value: isEnglish && obj.nameEn ? obj.nameEn : obj.nameCn,
      enumerable: true,
      configurable: true,
    },
    nameSecondary: {
      value: isEnglish ? obj.nameCn : obj.nameEn || undefined,
      enumerable: true,
      configurable: true,
    },
  });

  return obj as Localized<T>;
}

/**
 * Maps an array of objects to include localized name properties (in place)
 */
export function addLocalizedNamesToArray<T extends LocalizableNames>(
  items: T[],
  locale: string,
): Localized<T>[] {
  return items.map((item) => addLocalizedNames(item, locale));
}

/**
 * Helper for nested objects (e.g., course.educationLevel)
 * Maps multiple objects within a parent object, localizing specified fields
 */
export function addLocalizedNamesToObject<T extends Record<string, any>>(
  obj: T,
  locale: string,
  fields: (keyof T)[],
): T {
  for (const field of fields) {
    if (
      obj[field] &&
      typeof obj[field] === "object" &&
      "nameCn" in obj[field]
    ) {
      addLocalizedNames(obj[field], locale);
    }
  }
  return obj;
}
