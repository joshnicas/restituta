const TANZANIAN_MOBILE = /^[67]\d{8}$/;

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Canonical storage form for Tanzanian numbers is 255 followed by 9 digits. */
export function normalizePhoneNumber(input: string): string {
  const digits = phoneDigits(input.trim());
  if (/^255[67]\d{8}$/.test(digits)) return digits;
  if (/^0[67]\d{8}$/.test(digits)) return `255${digits.slice(1)}`;
  if (TANZANIAN_MOBILE.test(digits)) return `255${digits}`;
  // Preserve support for non-Tanzanian numbers while removing presentation characters.
  return input.trim().replace(/[\s().-]/g, "");
}

/** Include legacy spellings so accounts registered before normalization remain discoverable. */
export function phoneNumberLookupVariants(input: string): string[] {
  const normalized = normalizePhoneNumber(input);
  const digits = phoneDigits(normalized);
  if (!/^255[67]\d{8}$/.test(digits)) return [normalized];
  const local = digits.slice(3);
  return [...new Set([digits, `+${digits}`, `0${local}`, local])];
}
