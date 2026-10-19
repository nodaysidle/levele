import { PALETTE, uid } from "@/lib/editor/defaults";
import type { AccountRecord, Profile } from "@/lib/editor/types";
import { getAccountByEmail, putAccount, updateDocOwner, listDocRecords } from "./db";

const PROFILE_KEY = "levele.profile";
const SESSION_KEY = "levele.session";
const GUEST_COLORS = ["#FF5A36", "#0E7C66", "#2F6FED", "#8B5CF6", "#E5484D", "#B08968"];

const randomName = () => {
  const nouns = ["Otter", "Falcon", "Maple", "Comet", "Cedar", "Indigo", "Mango", "Pixel"];
  return `Guest ${nouns[Math.floor(Math.random() * nouns.length)]} ${Math.floor(100 + Math.random() * 900)}`;
};

const readJSON = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJSON = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const colorForId = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[11 + (Math.abs(hash) % 12)] ?? "#FF5A36";
};

export function getGuestProfile(): Profile {
  const existing = readJSON<Profile>(PROFILE_KEY);
  if (existing) return existing;
  const profile: Profile = {
    id: uid("guest_"),
    name: randomName(),
    color: GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)],
    guest: true,
  };
  writeJSON(PROFILE_KEY, profile);
  return profile;
}

export async function getCurrentProfile(): Promise<Profile> {
  const sessionId = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
  if (sessionId) {
    const account = await import("./db").then((m) => m.getAccount(sessionId));
    if (account) {
      return {
        id: account.id,
        name: account.name,
        email: account.email,
        color: account.color,
        guest: false,
      };
    }
    localStorage.removeItem(SESSION_KEY);
  }
  return getGuestProfile();
}

const bufferToBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const base64ToBuffer = (b64: string) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

async function hashPassword(password: string, saltB64?: string) {
  const salt = saltB64 ? new Uint8Array(base64ToBuffer(saltB64)) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return { salt: btoa(String.fromCharCode(...salt)), hash: bufferToBase64(bits) };
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<Profile> {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) throw new Error("Please enter your name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Please enter a valid email address.");
  if (input.password.length < 8) throw new Error("Password must be at least 8 characters.");
  const existing = await getAccountByEmail(email);
  if (existing) throw new Error("An account with that email already exists on this device.");

  const { salt, hash } = await hashPassword(input.password);
  const account: AccountRecord = {
    id: uid("acct_"),
    email,
    name: input.name.trim(),
    color: colorForId(email),
    salt,
    hash,
    createdAt: Date.now(),
  };
  await putAccount(account);

  // Claim designs made as a guest on this device.
  const guest = getGuestProfile();
  if (guest.guest) {
    try {
      const docs = await listDocRecords(guest.id);
      await Promise.all(docs.map((d) => updateDocOwner(d.id, account.id)));
    } catch {
      /* non-fatal */
    }
  }

  localStorage.setItem(SESSION_KEY, account.id);
  return { id: account.id, name: account.name, email: account.email, color: account.color, guest: false };
}

export async function signIn(email: string, password: string): Promise<Profile> {
  const account = await getAccountByEmail(email.trim().toLowerCase());
  if (!account) throw new Error("No account found for that email on this device.");
  const { hash } = await hashPassword(password, account.salt);
  if (hash !== account.hash) throw new Error("That password doesn't match.");
  localStorage.setItem(SESSION_KEY, account.id);
  return { id: account.id, name: account.name, email: account.email, color: account.color, guest: false };
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function updateGuestName(name: string): Profile {
  const profile = getGuestProfile();
  const updated = { ...profile, name: name.trim() || profile.name };
  writeJSON(PROFILE_KEY, updated);
  return updated;
}
