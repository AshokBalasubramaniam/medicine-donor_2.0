const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (v = "") => EMAIL_RE.test(v.trim());

const phoneDigits = (v = "") => v.replace(/\D/g, "").length;

export const isPhone = (v = "") => /^[+\d][\d\s()-]*$/.test(v.trim()) && phoneDigits(v) >= 10 && phoneDigits(v) <= 15;

export function validateIdentifier(value) {
  const v = value.trim();
  if (!v) return "Enter your email or phone number";
  if (v.includes("@") ? !isEmail(v) : !isPhone(v)) return "Enter a valid email address or phone number";
  return "";
}

export function validateNewPassword(value) {
  if (!value) return "Create a password";
  if (value.length < 8) return "Use at least 8 characters";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Include at least one letter and one number";
  return "";
}

export function passwordStrength(password = "") {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  return { score: Math.max(1, score), label: labels[score] };
}
