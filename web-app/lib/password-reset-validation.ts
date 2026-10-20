export type PasswordResetErrors = {
  password?: string;
  confirmation?: string;
};

export function validatePasswordReset(password: string, confirmation: string): PasswordResetErrors {
  const errors: PasswordResetErrors = {};
  if (password.length < 12) {
    errors.password = "Password must be at least 12 characters.";
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Password must include at least one letter and one number.";
  }
  if (password !== confirmation) errors.confirmation = "Passwords do not match.";
  return errors;
}
