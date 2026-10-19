export const randomBytes = (bytes: number): string => {
  const data = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(data);
  } else {
    for (let i = 0; i < bytes; i++) data[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("");
};
