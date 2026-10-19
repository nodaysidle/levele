"use client";

import { useEffect, useState } from "react";
import { LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { Modal, Spinner } from "@/components/ui/Modal";
import { getGuestProfile, signIn, signOut, signUp, updateGuestName } from "@/lib/storage/auth";
import type { Profile } from "@/lib/editor/types";

export default function AccountDialog({
  open,
  onClose,
  profile,
  onProfile,
  onChanged,
  toast,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onProfile: (p: Profile) => void;
  onChanged?: () => void;
  toast: (msg: string, kind?: "info" | "success" | "error") => void;
}) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState(profile?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) setGuestName(profile?.name ?? "");
  }, [open, profile?.name]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const next =
        mode === "signup"
          ? await signUp({ name, email, password })
          : await signIn(email, password);
      onProfile(next);
      setPassword("");
      toast(mode === "signup" ? "Account created — designs claimed" : `Welcome back, ${next.name}`, "success");
      onChanged?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={profile?.guest === false ? "Your account" : "Keep your work together"}
      subtitle={
        profile?.guest === false
          ? "Your local-first Levele account."
          : "No account needed to design. An account keeps your library separated and lets teammates recognize you."
      }
      width={480}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-[var(--muted-2)]">
            <ShieldCheck size={12} /> Passwords hashed with PBKDF2
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {profile && !profile.guest ? (
        <div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--line)] bg-[var(--panel)]">
            <span
              className="w-12 h-12 rounded-full grid place-items-center text-white text-lg font-bold shrink-0"
              style={{ background: profile.color }}
            >
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold truncate">{profile.name}</div>
              <div className="text-[11.5px] text-[var(--muted)] truncate">{profile.email}</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[var(--line)] p-3.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
            <p className="m-0">
              <strong className="text-[var(--ink)]">Local-first by design.</strong> This account and its
              designs live in this browser&apos;s IndexedDB. Export a project file or share a live link to
              move work between devices. A server-backed account layer is the main piece left for a
              production multi-device deployment.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm w-full mt-4"
            onClick={() => {
              signOut();
              const guest = getGuestProfile();
              onProfile(guest);
              setGuestName(guest.name);
              toast("Signed out — back to guest mode");
              onChanged?.();
              onClose();
            }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      ) : (
        <div>
          <div className="segmented mb-4">
            <button type="button" className={mode === "signup" ? "is-active" : ""} onClick={() => { setMode("signup"); setError(""); }}>
              Create account
            </button>
            <button type="button" className={mode === "signin" ? "is-active" : ""} onClick={() => { setMode("signin"); setError(""); }}>
              Sign in
            </button>
          </div>

          <div className="space-y-3">
            {mode === "signup" ? (
              <div>
                <label className="label">Your name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mara Okafor" autoComplete="name" />
              </div>
            ) : null}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mara@studio.co" autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submit();
                }}
              />
            </div>
            {error ? <p className="text-[11.5px] text-[#b42318] m-0">{error}</p> : null}
            <button
              type="button"
              className="btn btn-dark w-full"
              disabled={busy || !email || !password || (mode === "signup" && !name)}
              onClick={() => void submit()}
            >
              {busy ? <Spinner size={14} /> : <Sparkles size={14} />}
              {mode === "signup" ? "Create my account" : "Sign in"}
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--line)]">
            <label className="label">Or keep editing as a guest</label>
            <div className="flex gap-2">
              <input
                className="input"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Display name for comments"
                aria-label="Guest display name"
              />
              <button
                type="button"
                className="btn btn-outline btn-sm shrink-0"
                onClick={() => {
                  const next = updateGuestName(guestName);
                  onProfile(next);
                  toast("Display name updated");
                  onClose();
                }}
              >
                Save
              </button>
            </div>
            <p className="text-[10px] leading-relaxed text-[var(--muted-2)] mt-2">
              Guest designs save automatically in this browser. Signing up claims the designs made as a
              guest on this device.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
