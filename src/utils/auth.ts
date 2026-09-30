export const VALID_USERNAME = "legialoi";
export const VALID_PASSWORD = "101   101!@#";

export const checkCredentials = (username: string, password: string): boolean => {
  const u = username.trim().toLowerCase();
  const p = password.trim();
  if (u !== "legialoi") return false;

  return (
    p === "101   101!@#" ||
    p === "101   101!@#." ||
    p === "101 101!@#" ||
    p === "101 101!@#." ||
    password === "101   101!@#" ||
    password === "101   101!@#."
  );
};
