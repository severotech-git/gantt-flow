export interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters',      test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter (A–Z)',  test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter (a–z)',  test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number (0–9)',            test: (pw) => /[0-9]/.test(pw) },
  { label: 'One special character',       test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

/** Returns an error message if the password fails any rule, or null if valid. */
export function validatePassword(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.label + ' is required.';
  }
  return null;
}
