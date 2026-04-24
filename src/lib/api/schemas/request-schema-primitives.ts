import { z } from "zod";
import { CommentVisibilitySchema } from "../model-schemas";

const parseOptionalIntLike = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
};

const parseOptionalInt = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || !/^-?\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export const integerStringSchema = z
  .string()
  .trim()
  .regex(/^-?\d+$/);

export const commentReactionTypeSchema = z.enum([
  "upvote",
  "downvote",
  "heart",
  "laugh",
  "hooray",
  "confused",
  "rocket",
  "eyes",
]);

export const sectionCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/);

export const commentVisibilitySchema = CommentVisibilitySchema;

export const commentTargetTypeSchema = z.enum([
  "section",
  "course",
  "teacher",
  "section-teacher",
  "homework",
]);

export const descriptionTargetTypeSchema = z.enum([
  "section",
  "course",
  "teacher",
  "homework",
]);

export const todoPrioritySchema = z.enum(["low", "medium", "high"]);

export { parseOptionalInt, parseOptionalIntLike };
