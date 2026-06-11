const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const HANDLE = /(^|\s)@[A-Za-z0-9_]{2,}/;
const ADDRESS = /\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|boulevard|blvd|drive|dr|way)\b/i;
const ADDRESS_KEYWORDS = /\b(street|avenue|boulevard)\b/i;

export type PIIType = "phone" | "email" | "social handle" | "address" | null;

export function detectPII(text: string): PIIType {
  if (!text) return null;
  if (EMAIL.test(text)) return "email";
  if (PHONE.test(text)) return "phone";
  if (HANDLE.test(text)) return "social handle";
  if (ADDRESS.test(text) || (text.match(/\d/) && ADDRESS_KEYWORDS.test(text))) return "address";
  return null;
}