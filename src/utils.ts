export const sanitizeEmail = (email: string) => {
  return email.trim().toLowerCase();
};

export const sanitizePassword = (password: string) => {
  return password.trim();
};
