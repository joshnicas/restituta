/** Canonical identity form for Tanzanian mobile numbers. */
export function normalizeTanzanianPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (/^255[67]\d{8}$/.test(digits)) return digits;
  if (/^0[67]\d{8}$/.test(digits)) return `255${digits.slice(1)}`;
  if (/^[67]\d{8}$/.test(digits)) return `255${digits}`;
  return value.trim().replace(/[\s().-]/g, "");
}
