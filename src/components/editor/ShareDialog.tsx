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
  Users,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useEditor } from "@/lib/editor/store";
import { buildShareLinks } from "@/lib/share";
import { downloadProject } from "@/lib/export/exporter";

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
}: {
  label: string;
  description: string;
  link: string | null;
  onCopy: () => void;
  copied: boolean;
  icon: React.ReactNode;
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
            <p className="text-[10.5px] text-[#8a6a4e] bg-[#fff7ed] border border-[#f5dfc4] rounded-md px-2 py-1.5 mt-2 leading-relaxed">
              This design is too large to embed in a URL (uploaded photos). Use the live link while this
              tab is open, or send the downloadable project file.
            </p>
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

  useEffect(() => {
    if (!open || !session || !doc) return;
    let alive = true;
    setLiveStarting(true);
    void session
      .connect(doc.id, profile ?? undefined)
      .then(() => {
        if (alive) setLiveReady(true);
      })
      .catch(() => {
        if (alive) toast("Live collaboration couldn't start. You can still share a snapshot.", "error");
      })
      .finally(() => {
        if (alive) setLiveStarting(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session, doc?.id]);

  useEffect(() => {
    if (!open || !session) return;
    const tick = () => setLiveConnected(!!session.provider?.connected);
    tick();
    const id = setInterval(tick, 900);
    return () => clearInterval(id);
  }, [open, session]);

  const links = useMemo(() => (doc && origin ? buildShareLinks(doc, origin) : null), [doc, origin]);

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
            {liveConnected ? "Live sync ready · MQTT relay" : liveStarting ? "Starting live session…" : "Local-first sharing"}
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
            {liveConnected ? "Live collaboration is on" : liveStarting ? "Starting live session…" : liveReady ? "Relay connecting…" : "Live collaboration is off"}
          </div>
          <p className="text-[10.5px] text-[var(--muted)] m-0 mt-0.5">
            {peers.length
              ? `${peers.length} collaborator${peers.length > 1 ? "s" : ""} connected`
              : liveConnected
                ? "Open the live link on another device or tab to edit together."
                : "Waiting for the MQTT relay — snapshot and project sharing still work offline."}
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
      </div>

      {!liveConnected && !liveStarting ? (
        <div className="mb-3 rounded-lg border border-[#f5dfc4] bg-[#fff7ed] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#8a6a4e]">
          Live relay is not reachable yet. Snapshot links and the project file still work; for
          multi-device sessions check your network and the optional <code>NEXT_PUBLIC_MQTT_URL</code>.
        </div>
      ) : null}
      {links?.tooLarge ? (
        <div className="mb-3 rounded-lg border border-[#f5dfc4] bg-[#fff7ed] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#8a6a4e]">
          This design is too large to embed in a URL (usually because of uploaded images). The live
          link will work while the creator&apos;s tab is open, but it can&apos;t open standalone. Send the
          project file for a fully offline handoff.
        </div>
      ) : null}
      <div className="space-y-3">
        <LinkRow
          icon={liveReady ? <Radio size={15} /> : <Loader2 size={15} className={liveStarting ? "spin" : ""} />}
          label="Live collaboration link"
          description="Anyone with the link can join the same design and edits sync in real time. The design is embedded when small enough, so it still opens when you're away."
          link={links?.live ?? null}
          onCopy={() => links && void doCopy("live", links.live)}
          copied={copied === "live"}
        />
        <LinkRow
          icon={<Link2 size={15} />}
          label="Snapshot copy link"
          description="Opens a fresh, independent copy of the design. Great for feedback rounds or sending a read-only starting point."
          link={links?.copy ?? null}
          onCopy={() => links?.copy && void doCopy("copy", links.copy)}
          copied={copied === "copy"}
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
          Live edits travel through a public MQTT relay as Yjs updates; no central document server
          stores your design. Anyone with the room link can join, so treat the link as the password.
          Point <code>NEXT_PUBLIC_MQTT_URL</code> at your own broker for private deployments.
        </p>
      </div>
    </Modal>
  );
}
