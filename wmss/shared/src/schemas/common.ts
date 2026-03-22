import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/u, 'Invalid ObjectId');

export const paginationQuerySchema = z
  .object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sort: z.string().optional(),
    query: z.string().optional()
  })
  .partial();

export const emailSchema = z.string().email();
export const dateSchema = z.coerce.date();
export const positiveNumber = z.number().positive();
