/**
 * OTP helpers
 */

export function generateOtpCode(length = 5): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export function normalizePhone(phone: string): string | null {
  // Remove spaces, dashes, etc.
  let p = phone.replace(/[\s\-\(\)]/g, "");

  // Convert Persian/Arabic digits to English
  p = p.replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728));
  p = p.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));

  // Handle +98 or 98 prefix
  if (p.startsWith("+98")) p = "0" + p.slice(3);
  if (p.startsWith("98") && p.length === 12) p = "0" + p.slice(2);

  // Must be 11 digits starting with 09
  if (!/^09\d{9}$/.test(p)) return null;
  return p;
}

export function otpExpiresAt(minutes = 5): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}
