export const COUNTRY_CONFIG = {
  all: {
    label: "Global",
    flag: "🌍",
    cities: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Pune", "Chennai", "New York", "Los Angeles", "Chicago", "Austin", "Miami"],
    defaultCity: "Berlin",
    defaultCurrency: "EUR",
    currencySymbol: "€",
  },
  IN: {
    label: "India",
    flag: "🇮🇳",
    cities: ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Pune", "Chennai"],
    defaultCity: "Delhi",
    defaultCurrency: "INR",
    currencySymbol: "₹",
  },
  DE: {
    label: "Germany",
    flag: "🇩🇪",
    cities: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"],
    defaultCity: "Berlin",
    defaultCurrency: "EUR",
    currencySymbol: "€",
  },
  US: {
    label: "USA",
    flag: "🇺🇸",
    cities: ["New York", "Los Angeles", "Chicago", "Austin", "Miami"],
    defaultCity: "New York",
    defaultCurrency: "USD",
    currencySymbol: "$",
  },
} as const;

export type CountryCode = keyof typeof COUNTRY_CONFIG;

export function currencySymbol(currency: string): string {
  const map: Record<string, string> = { EUR: "€", USD: "$", INR: "₹", GBP: "£", CHF: "Fr" };
  return map[currency] ?? currency;
}

export function fmtAmount(amountCents: number, currency: string): string {
  return `${currencySymbol(currency)}${(amountCents / 100).toFixed(0)}`;
}
