import { z } from "zod";

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 200;

export const taskContentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Введите название")
    .max(TITLE_MAX, `Не больше ${TITLE_MAX} символов`),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `Не больше ${DESCRIPTION_MAX} символов`),
});
export type TaskContent = z.output<typeof taskContentSchema>;
