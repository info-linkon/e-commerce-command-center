// Prefixes of non-Israeli (Palestinian) mobile numbers that our SMS provider
// can't reliably reach — cash orders from these numbers skip OTP verification.
const NO_OTP_PREFIXES = ["059", "056"];

/** "+970 59-123 4567" / "972561234567" / "0591234567" → "0591234567". */
export function toLocalPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("970") || digits.startsWith("972")) digits = "0" + digits.slice(3);
  return digits;
}

export function requiresPhoneVerification(phone: string): boolean {
  const local = toLocalPhone(phone);
  return !NO_OTP_PREFIXES.some((p) => local.startsWith(p));
}
