import { z } from 'zod';

export const createAdminSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(12).max(200),
});

export const updateAdminSchema = z.object({
  firstName: z.string().trim().min(2).max(100).optional(),
  lastName: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one field to update.' },
);

export const resetAdminPasswordSchema = z.object({
  password: z.string().min(12).max(200),
});