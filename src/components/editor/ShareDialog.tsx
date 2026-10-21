"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Radio,
  Share2,
  Square,
  Users,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useEditor } from "@/lib/editor/store";
import { buildShareLinks } from "@/lib/share";
import { downloadProject } from "@/lib/export/exporter";
import { randomBytes } from "@/lib/editor/random";

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
};

function LinkRow({
  label,
  description,
  link,
  onCopy,
  copied,
  icon,
  empty,
}: {
  label: string;
  description: string;
  link: string | null;
  onCopy: () => void;
  copied: boolean;
  icon: React.ReactNode;
  empty: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-[var(--panel-2)] grid place-items-center text-[var(--ink-soft)] shrink-0">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <strong className="text-[12.5px] font-semibold">{label}</strong>
            {link ? (
              <button type="button" className="btn btn-dark btn-xs" onClick={onCopy}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            ) : null}
          </div>
          <p className="text-[10.5px] text-[var(--muted)] mt-1 leading-relaxed">{description}</p>
          {link ? (
            <div className="share-link mt-2">
              <code title={link}>{link}</code>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="w-7 h-7 rounded-md grid place-items-center text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--ink)]"
                title="Open link"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            empty
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor((s) => s.doc);
  const session = useEditor((s) => s.session);
  const profile = useEditor((s) => s.profile);
  const peers = useEditor((s) => s.peers);
  const toast = useEditor((s) => s.toast);
  const [copied, setCopied] = useState<string | null>(null);
  const [liveStarting, setLiveStarting] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const roomKey = session?.roomKey;
  useEffect(() => {
    setLiveReady(!!roomKey);
  }, [roomKey, open]);

  // Opt-in only: nothing leaves this browser until the user starts a live session.
  const startLive = () => {
    if (!session) return;
    setLiveStarting(true);
    void session
      .connect(session.roomKey ?? randomBytes(32), profile ?? undefined)
      .then(() => setLiveReady(true))
      .catch(() => toast("Live collaboration couldn't start. You can still share a snapshot.", "error"))
      .finally(() => setLiveStarting(false));
  };

  const endLive = () => {
    session?.endLive();
    setLiveReady(false);
    // Drop #room from the address bar so a reload doesn't rejoin.
    window.history.replaceState({}, "", window.location.pathname);
    toast("Live session ended. Old links no longer sync with this design.", "success");
  };

  useEffect(() => {
    if (!open || !session) return;
    const tick = () => setLiveConnected(!!session.provider?.connected);
    tick();
    const id = setInterval(tick, 900);
    return () => clearInterval(id);
  }, [open, session]);

  const links = useMemo(
    () => (doc && origin ? buildShareLinks(doc, origin, liveReady ? session?.roomKey : undefined) : null),
    [doc, origin, liveReady, session],
  );

  const markCopied = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  const doCopy = async (key: string, value: string) => {
    const ok = await copyText(value);
    if (ok) {
      markCopied(key);
      toast("Link copied", "success");
    } else {
      toast("Couldn't access the clipboard — select the link and copy manually.", "error");
    }
  };

  if (!doc) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share this design"
      subtitle="Collaborate live, send a snapshot, or hand off a project file."
      width={610}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-[10px] text-[var(--muted-2)]">
            {liveConnected ? "Live session on · end-to-end encrypted" : liveStarting ? "Starting live session…" : "Saved only in this browser"}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => doc && downloadProject(doc)}>
              <Download size={13} /> Project file
            </button>
            <button type="button" className="btn btn-dark btn-sm" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      }
    >
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--panel)] border border-[var(--line)] mb-4">
        <span className="w-9 h-9 rounded-lg bg-white border border-[var(--line)] grid place-items-center text-[var(--ink)]">
          <Users size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${liveConnected ? "bg-[#0E7C66]" : "bg-[#FFC56E]"}`} />
            {liveConnected ? "Live collaboration is on" : liveStarting ? "Starting live session…" : liveReady ? "Connecting…" : "Live collaboration is off"}
          </div>
          <p className="text-[10.5px] text-[var(--muted)] m-0 mt-0.5">
            {peers.length
              ? `${peers.length} collaborator${peers.length > 1 ? "s" : ""} connected`
              : liveConnected
                ? "Open the live link on another device or tab to edit together."
                : liveReady
                  ? "Connecting to the live relay. Snapshot links and the project file work offline."
                  : "Start a live session to edit together in real time."}
          </p>
        </div>
        {peers.length ? (
          <div className="flex -space-x-1.5">
            {peers.slice(0, 4).map((p) => (
              <span
                key={p.id}
                className="w-6 h-6 rounded-full border-2 border-white grid place-items-center text-[8px] font-bold text-white"
                style={{ background: p.color }}
                title={p.name}
              >
                {p.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </div>
        ) : null}
        {!liveReady ? (
          <button type="button" className="btn btn-dark btn-sm" onClick={startLive} disabled={liveStarting}>
            {liveStarting ? <Loader2 size={13} className="spin" /> : <Radio size={13} />} Start live session
          </button>
        ) : (
          <button type="button" className="btn btn-outline btn-sm" onClick={endLive}>
            <Square size={12} /> End live session
          </button>
        )}
      </div>

      <div className="space-y-3">
        <LinkRow
          icon={liveReady ? <Radio size={15} /> : <Loader2 size={15} className={liveStarting ? "spin" : ""} />}
          label="Live collaboration link"
          description="Anyone with this link can edit with you in real time. The link holds the encryption key, so share it like a password."
          link={links?.live ?? null}
          onCopy={() => links?.live && void doCopy("live", links.live)}
          copied={copied === "live"}
          empty={
            <p className="text-[10.5px] text-[var(--muted)] mt-2 leading-relaxed">
              Start a live session above to get this link.
            </p>
          }
        />
        <LinkRow
          icon={<Link2 size={15} />}
          label="Snapshot copy link"
          description="Opens a separate, editable copy. Changes to the copy never touch your design."
          link={links?.copy ?? null}
          onCopy={() => links?.copy && void doCopy("copy", links.copy)}
          copied={copied === "copy"}
          empty={
            <p className="text-[10.5px] text-[#8a6a4e] bg-[#fff7ed] border border-[#f5dfc4] rounded-md px-2 py-1.5 mt-2 leading-relaxed">
              This design is too large for a link, usually because of uploaded photos. Send the project
              file instead.
            </p>
          }
        />
      </div>

      <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 flex items-start gap-3">
        <Download size={16} className="text-[var(--muted)] mt-0.5 shrink-0" />
        <div>
          <div className="text-[11.5px] font-semibold">Offline-ready handoff</div>
          <p className="text-[10.5px] text-[var(--muted)] leading-relaxed mt-1">
            Download the <code>.levele.json</code> project and import it from the dashboard on any
            device. It includes every page, layer, animation, comment and uploaded image.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2.5 text-[10px] leading-relaxed text-[var(--muted-2)]">
        <Share2 size={13} className="mt-0.5 shrink-0" />
        <p className="m-0">
          Live edits pass through a public relay, encrypted with a key that exists only in the live
          link. The relay keeps the latest encrypted copy so people can join while you&apos;re away.
          Snapshot links carry the design itself, so share them deliberately.
        </p>
      </div>
    </Modal>
  );
}
