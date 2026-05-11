import { z } from 'zod';

const unsafePatterns = /(<script|<\/script|javascript:|on\w+=|<iframe|<\/iframe|%3Cscript|%3Ciframe)/i;
const emailLocalPart = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+$/;
const emailDomain = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function sanitizeInput(input: string): string {
  return input.replace(/[<>'"]/g, '');
}

function isValidEmail(email: string): boolean {
  const [local, domain] = email.split('@');
  if (!local || !domain) return false;
  return emailLocalPart.test(local) && emailDomain.test(domain);
}

export const loginSchema = z.object({
  email: z.string()
    .max(254, 'Email too long')
    .transform(sanitizeInput)
    .refine(isValidEmail, { message: 'Invalid email address' }),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
});

export const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .transform(sanitizeInput)
    .refine(val => !unsafePatterns.test(val), { message: 'Name contains unsafe characters' }),
  email: z.string()
    .max(254, 'Email too long')
    .transform(sanitizeInput)
    .refine(isValidEmail, { message: 'Invalid email address' }),
  phone: z.string()
    .regex(/^[1-9][0-9]{9}$/, 'Phone must be 10 digits starting with 1-9')
    .transform(val => val.replace(/\D/g, '')),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .refine(val => /[A-Z]/.test(val), { message: 'Password must contain at least one uppercase letter' })
    .refine(val => /[a-z]/.test(val), { message: 'Password must contain at least one lowercase letter' })
    .refine(val => /[0-9]/.test(val), { message: 'Password must contain at least one number' })
    .refine(val => /[!@#$%^&*(),.?":{}|<>]/.test(val), { message: 'Password must contain at least one special character' })
});

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export const addToCartSchema = z.object({
  variantId: z.string()
    .transform(sanitizeInput)
    .refine(isValidUUID, { message: 'Invalid variant ID' }),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Minimum quantity is 1')
    .max(10, 'Maximum 10 items per variant')
}).strict();

export const updateCartItemSchema = z.object({
  cartItemId: z.string()
    .transform(sanitizeInput)
    .refine(isValidUUID, { message: 'Invalid cart item ID' }),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Minimum quantity is 1')
    .max(10, 'Maximum 10 items allowed')
}).strict();

export const createOrderSchema = z.object({
  items: z.array(z.object({
    variantId: z.string()
      .transform(sanitizeInput)
      .refine(isValidUUID, { message: 'Invalid variant ID' }),
    quantity: z.number()
      .int('Quantity must be a whole number')
      .min(1, 'Minimum quantity is 1')
      .max(99, 'Maximum 99 items per variant')
  }))
    .min(1, 'Cart cannot be empty')
    .max(50, 'Maximum 50 different items allowed'),
  address: z.object({
    line1: z.string()
      .min(5, 'Address line 1 is required')
      .max(200, 'Address too long')
      .transform(sanitizeInput),
    line2: z.string()
      .max(200, 'Address line 2 too long')
      .transform(sanitizeInput)
      .optional(),
    city: z.string()
      .min(2, 'City is required')
      .max(100, 'City name too long')
      .transform(sanitizeInput),
    state: z.string()
      .min(2, 'State is required')
      .max(100, 'State name too long')
      .transform(sanitizeInput),
    postalCode: z.string()
      .regex(/^[1-9][0-9]{5}$/, 'PIN code must be 6 digits starting with 1-9'),
    country: z.string()
      .max(100, 'Country name too long')
      .default('India')
  }),
  phone: z.string()
    .regex(/^[1-9][0-9]{9}$/, 'Phone must be 10 digits starting with 1-9')
    .transform(val => val.replace(/\D/g, ''))
}).strict();

export const updateOrderStatusSchema = z.object({
  orderId: z.string()
    .transform(sanitizeInput)
    .refine(isValidUUID, { message: 'Invalid order ID' }),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], {
    message: 'Invalid order status'
  }),
  adminNotes: z.string()
    .max(1000, 'Notes too long')
    .transform(sanitizeInput)
    .optional(),
  confirmedPrice: z.number()
    .int('Price must be a whole number')
    .positive('Price must be positive')
    .max(1000000, 'Price too high')
    .optional()
}).strict();

export const stockNotificationSchema = z.object({
  variantId: z.string()
    .transform(sanitizeInput)
    .refine(isValidUUID, { message: 'Invalid variant ID' }),
  email: z.string()
    .max(254, 'Email too long')
    .transform(sanitizeInput)
    .refine(isValidEmail, { message: 'Invalid email address' })
}).strict();

export const updateStockSchema = z.object({
  variantId: z.string()
    .transform(sanitizeInput)
    .refine(isValidUUID, { message: 'Invalid variant ID' }),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative')
    .max(999999, 'Quantity too large')
}).strict();
