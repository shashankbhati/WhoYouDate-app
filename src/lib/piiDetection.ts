const PHONE_REGEX = /(\+?\d[\s\-.]?){7,}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const ADDRESS_REGEX = /\b\d+\s+[a-zA-Z]+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd)\b/gi;
const SOCIAL_REGEX = /@[a-zA-Z0-9_]{2,}/g;

export type PiiType = 'phone number' | 'email address' | 'street address' | 'social media handle';

export function detectPii(text: string): PiiType | null {
  if (PHONE_REGEX.test(text)) return 'phone number';
  if (EMAIL_REGEX.test(text)) return 'email address';
  if (ADDRESS_REGEX.test(text)) return 'street address';
  if (SOCIAL_REGEX.test(text)) return 'social media handle';
  return null;
}
