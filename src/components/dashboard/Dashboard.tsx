"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Copy,
  Download,
  FileUp,
  Layers,
  LayoutTemplate,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  Wand2,
  PlayCircle,
  Image as ImageIcon,
} from "lucide-react";
import { TEMPLATES, TEMPLATE_CATEGORIES, templateToDoc, type TemplateDefinition } from "@/lib/editor/templates";
import { buildTemplate } from "@/lib/editor/templates";
import { DOC_SIZES, createDoc, sizeFor, uid } from "@/lib/editor/defaults";
import type { DocType, Profile, StoredDoc } from "@/lib/editor/types";
import { getCurrentProfile } from "@/lib/storage/auth";
import { deleteDocRecord, listDocRecords, saveDocRecord } from "@/lib/storage/db";
import { downloadProject, parseProjectFile } from "@/lib/export/exporter";
import StaticPreview from "@/components/canvas/StaticPreview";
import { Toasts } from "@/components/ui/Modal";
import NewDesignDialog, { type NewDesignPayload } from "./NewDesignDialog";
import AccountDialog from "@/components/editor/AccountDialog";

const ago = (ts: number) => {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function Lazy({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {visible ? children : <div className="h-full w-full rounded-lg bg-black/[0.035] animate-pulse" />}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-mark" aria-hidden>
        <svg width="17" height="17" viewBox="0 0 64 64" fill="none">
          <path d="M18 16h9v23h19v9H18z" fill="#F6EFE4" />
          <circle cx="46" cy="18" r="6" fill="#FF5A36" />
        </svg>
      </span>
      Levele
    </Link>
  );
}

function TemplateCard({
  template,
  onPick,
}: {
  template: TemplateDefinition;
  onPick: (t: TemplateDefinition) => void;
}) {
  const content = useMemo(() => buildTemplate(template), [template]);
  const aspect = content.width / content.height;
  const width = Math.round(Math.min(280, 176 * aspect));
  const page = content.pages[0];
  return (
    <button type="button" className="template-card group" onClick={() => onPick(template)}>
      <div className="template-thumb">
        <span className="template-badge">Use template</span>
        <Lazy className="flex h-full w-full items-center justify-center">
          {page ? (
            <div style={{ width, maxHeight: "100%", overflow: "hidden", boxShadow: "0 8px 22px rgba(23,22,26,.16)" }}>
              <StaticPreview
                width={width}
                docWidth={content.width}
                docHeight={content.height}
                page={page}
                elements={content.elements}
              />
            </div>
          ) : null}
        </Lazy>
      </div>
      <h3>{template.name}</h3>
      <p>
        {template.category} · {content.width} × {content.height}
      </p>
    </button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<StoredDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [newOpen, setNewOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; kind: "info" | "success" | "error" }[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toast = (message: string, kind: "info" | "success" | "error" = "info") => {
    const id = uid("toast_");
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  };

  const refresh = async () => {
    try {
      const current = await getCurrentProfile();
      setProfile(current);
      setDocs(await listDocRecords(current.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!menuFor) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuFor(null);
    };
    window.addEventListener("pointerdown", onClick);
    return () => window.removeEventListener("pointerdown", onClick);
  }, [menuFor]);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      const matchesCategory = category === "All" || t.category === category;
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q)) ||
        t.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => !q || d.title.toLowerCase().includes(q) || d.docType.includes(q));
  }, [docs, query]);

  const ensureProfile = async () => {
    if (profile) return profile;
    const p = await getCurrentProfile();
    setProfile(p);
    return p;
  };

  const createBlank = async (payload: NewDesignPayload) => {
    const p = await ensureProfile();
    const fallback = sizeFor(payload.docType);
    const doc = createDoc({
      docType: payload.docType,
      width: payload.width || fallback.width,
      height: payload.height || fallback.height,
      title: payload.title || undefined,
    });
    await saveDocRecord(doc, p.id);
    setNewOpen(false);
    router.push(`/editor/${doc.id}`);
  };

  const createFromTemplate = async (template: TemplateDefinition) => {
    const p = await ensureProfile();
    const doc = templateToDoc(template);
    await saveDocRecord(doc, p.id);
    router.push(`/editor/${doc.id}`);
  };

  const openDoc = (docId: string) => router.push(`/editor/${docId}`);

  const duplicateDoc = async (record: StoredDoc) => {
    setBusyId(record.id);
    const p = await ensureProfile();
    const clone = JSON.parse(JSON.stringify(record.doc)) as StoredDoc["doc"];
    clone.id = uid("doc_");
    clone.title = `${record.title} copy`;
    clone.createdAt = Date.now();
    clone.updatedAt = Date.now();
    await saveDocRecord(clone, p.id);
    await refresh();
    setBusyId(null);
    setMenuFor(null);
    toast("Design duplicated", "success");
  };

  const removeDoc = async (record: StoredDoc) => {
    if (!window.confirm(`Delete “${record.title}”? This can't be undone.`)) return;
    setBusyId(record.id);
    await deleteDocRecord(record.id);
    await refresh();
    setBusyId(null);
    setMenuFor(null);
    toast("Design deleted");
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    try {
      const imported = await parseProjectFile(file);
      const p = await ensureProfile();
      imported.id = uid("doc_");
      imported.createdAt = Date.now();
      imported.updatedAt = Date.now();
      if (!imported.title) imported.title = "Imported design";
      await saveDocRecord(imported, p.id);
      await refresh();
      toast("Project imported", "success");
      router.push(`/editor/${imported.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Import failed", "error");
    }
  };

  return (
    <div className="site-shell">
      <header className="site-nav">
        <div className="site-nav-inner">
          <Brand />
          <nav className="hidden md:flex items-center gap-6">
            <a href="#templates" className="nav-link">Templates</a>
            <a href="#designs" className="nav-link">Your designs</a>
            <a href="#features" className="nav-link">Why Levele</a>
          </nav>
          <div className="flex-1" />
          <div className="search-field hidden lg:block w-[210px]">
            <Search size={13} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates & designs"
              aria-label="Search templates and designs"
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setAccountOpen(true)}
            title={profile?.name}
          >
            {profile ? (
              <span
                className="w-6 h-6 rounded-full grid place-items-center text-[9px] font-bold text-white"
                style={{ background: profile.color }}
              >
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <UserRound size={14} />
            )}
            <span className="hidden sm:inline">{profile?.guest === false ? profile.name.split(" ")[0] : "Sign in"}</span>
          </button>
          <button type="button" className="btn btn-dark btn-sm" onClick={() => setNewOpen(true)}>
            <Plus size={14} />
            <span className="hidden sm:inline">New design</span>
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="animate-rise">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Open source · MIT · local-first
            </span>
            <h1>
              Design like you
              <br />
              <em>mean it.</em>
            </h1>
            <p className="hero-copy">
              A Canva-style studio that lives in your browser. Start from a template or a blank
              canvas, then shape type, images, layers and motion — free, fast and fully yours.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-accent" onClick={() => setNewOpen(true)}>
                Start a blank design <ArrowRight size={15} />
              </button>
              <a href="#templates" className="btn btn-outline">
                <LayoutTemplate size={15} /> Browse templates
              </a>
            </div>
            <p className="hero-note">
              <Sparkles size={12} className="text-[var(--accent)]" />
              No account required · autosaves as you work · export anywhere
            </p>
          </div>

          <div className="animate-rise" style={{ animationDelay: "0.08s" }}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                Start from a format
              </span>
              <button type="button" className="text-[10px] font-semibold text-[var(--accent)]" onClick={() => setNewOpen(true)}>
                More formats →
              </button>
            </div>
            <div className="quickgrid">
              {[
                { type: "social" as DocType, label: "Social post", sub: "1080 × 1080", w: 36, h: 36 },
                { type: "story" as DocType, label: "Story", sub: "1080 × 1920", w: 23, h: 41 },
                { type: "poster" as DocType, label: "Poster", sub: "A4 · 1240 × 1748", w: 28, h: 40 },
                { type: "slide" as DocType, label: "Presentation", sub: "16:9 · 1920 × 1080", w: 50, h: 28 },
              ].map((f) => (
                <button
                  key={f.type}
                  type="button"
                  className="quick-card"
                  onClick={() => void createBlank({ docType: f.type, width: 0, height: 0, title: "" })}
                >
                  <span className="quick-format">
                    <span style={{ width: f.w, height: f.h }} />
                  </span>
                  <strong>{f.label}</strong>
                  <span className="quick-sub">{f.sub}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex -space-x-1.5">
                  {["#FF5A36", "#0E7C66", "#2F6FED"].map((c) => (
                    <span key={c} className="w-5 h-5 rounded-full border-2 border-white" style={{ background: c }} />
                  ))}
                </span>
                <span className="text-[10.5px] text-[var(--muted)]">Templates, layers, motion & live collaboration</span>
              </div>
              <Wand2 size={14} className="text-[var(--muted-2)]" />
            </div>
          </div>
        </section>

        <section id="features" className="section pt-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: <Layers size={17} />, title: "Real layers", copy: "Group, align, snap, lock and reorder every element." },
              { icon: <PlayCircle size={17} />, title: "Motion built in", copy: "Entrance presets, loops and a full-screen Present mode." },
              { icon: <Users size={17} />, title: "Live by default", copy: "Comments, presence and live editing with Yjs over MQTT." },
              { icon: <Download size={17} />, title: "Export anywhere", copy: "PNG, JPG, multi-page PDF, animated GIF or short video." },
            ].map((f) => (
              <div key={f.title} className="card p-4">
                <span className="w-8 h-8 rounded-lg bg-[var(--panel-2)] grid place-items-center text-[var(--ink-soft)] mb-3">
                  {f.icon}
                </span>
                <h3 className="font-[var(--font-display)] text-[14px] font-semibold tracking-[-0.02em] m-0">{f.title}</h3>
                <p className="text-[10.5px] leading-relaxed text-[var(--muted)] mt-1 mb-0">{f.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="templates" className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Start something good</h2>
              <p className="section-sub">
                {TEMPLATES.length} fully editable starters. Every shape, word and colour is yours to change.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {TEMPLATE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`h-7 rounded-full px-3 text-[10.5px] font-semibold transition-colors ${
                    category === c
                      ? "bg-[var(--ink)] text-white"
                      : "bg-white/70 border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filteredTemplates.length ? (
            <div className="template-grid">
              {filteredTemplates.map((t) => (
                <TemplateCard key={t.id} template={t} onPick={(template) => void createFromTemplate(template)} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-[13px] font-medium m-0">No templates match “{query}”.</p>
              <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => { setQuery(""); setCategory("All"); }}>
                Clear filters
              </button>
            </div>
          )}
        </section>

        <section id="designs" className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Your designs</h2>
              <p className="section-sub">
                {loading
                  ? "Opening your library…"
                  : docs.length
                    ? `${docs.length} design${docs.length > 1 ? "s" : ""} saved in this browser`
                    : "Nothing here yet — your first canvas is one click away."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={importRef}
                type="file"
                accept=".json,.levele.json,application/json"
                className="hidden"
                onChange={(e) => {
                  void onImport(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => importRef.current?.click()}>
                <FileUp size={13} /> Import
              </button>
              <button type="button" className="btn btn-dark btn-sm" onClick={() => setNewOpen(true)}>
                <Plus size={13} /> New design
              </button>
            </div>
          </div>

          {profile?.guest ? (
            <div className="mb-4 rounded-xl border border-[var(--line)] bg-white/55 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-[var(--muted)] m-0 flex items-center gap-2">
                <UserRound size={13} />
                You&apos;re designing as <strong className="text-[var(--ink)]">{profile.name}</strong>. Designs stay in this browser.
              </p>
              <button type="button" className="text-[10.5px] font-semibold text-[var(--accent)]" onClick={() => setAccountOpen(true)}>
                Create an account →
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[18px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl bg-black/[0.04] animate-pulse" />
              ))}
            </div>
          ) : filteredDocs.length ? (
            <div className="design-grid">
              {filteredDocs.map((record) => {
                const size = DOC_SIZES.find((s) => s.type === record.docType);
                return (
                  <div key={record.id} className="design-card relative">
                    <button type="button" className="design-thumb w-full" onClick={() => openDoc(record.id)}>
                      {record.thumbnail ? (
                        <img src={record.thumbnail} alt="" style={{ maxHeight: 178, maxWidth: "100%" }} />
                      ) : (
                        <Lazy className="flex h-full w-full items-center justify-center">
                          <StaticPreview
                            width={Math.min(250, Math.round(160 * (record.width / record.height)))}
                            docWidth={record.doc.width}
                            docHeight={record.doc.height}
                            page={record.doc.pages[0]}
                            elements={record.doc.elements}
                          />
                        </Lazy>
                      )}
                    </button>
                    {busyId === record.id ? (
                      <span className="absolute top-2 right-2 h-5 w-5 rounded-full border-2 border-white border-t-[var(--accent)] spin" />
                    ) : null}
                    <div className="design-meta">
                      <div className="min-w-0">
                        <strong title={record.title}>{record.title}</strong>
                        <span>
                          {size?.label ?? record.docType} · {record.pageCount} page{record.pageCount > 1 ? "s" : ""} · {ago(record.updatedAt)}
                        </span>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          className="card-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuFor(menuFor === record.id ? null : record.id);
                          }}
                          aria-label="Design options"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {menuFor === record.id ? (
                          <div className="dropdown right-0 top-8" ref={menuRef} onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => openDoc(record.id)}>
                              <ArrowRight size={13} /> Open design
                            </button>
                            <button type="button" onClick={() => void duplicateDoc(record)}>
                              <Copy size={13} /> Duplicate
                            </button>
                            <button type="button" onClick={() => downloadProject(record.doc)}>
                              <Download size={13} /> Download project
                            </button>
                            <hr />
                            <button type="button" className="danger" onClick={() => void removeDoc(record)}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="design-card text-left"
                onClick={() => setNewOpen(true)}
                style={{ minHeight: 0 }}
              >
                <div className="design-thumb border-dashed !bg-transparent flex-col gap-2 text-[var(--muted)]">
                  <span className="w-9 h-9 rounded-full bg-white border border-[var(--line)] grid place-items-center">
                    <Plus size={16} />
                  </span>
                  <span className="text-[11px] font-medium">New design</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <span className="w-11 h-11 rounded-xl bg-white border border-[var(--line)] grid place-items-center mx-auto text-[var(--muted)]">
                <ImageIcon size={20} />
              </span>
              <h3 className="font-[var(--font-display)] text-[17px] font-semibold tracking-[-0.02em] mt-3 mb-1">
                {query ? "No designs match your search" : "A blank page is a good start"}
              </h3>
              <p className="text-[11.5px] text-[var(--muted)] max-w-[380px] mx-auto leading-relaxed">
                {query
                  ? "Try a different search, or start something new."
                  : "Create a blank canvas or borrow a starter template. Everything autosaves here, no account needed."}
              </p>
              <button type="button" className="btn btn-accent btn-sm mt-4" onClick={() => setNewOpen(true)}>
                <Plus size={13} /> Create a design
              </button>
            </div>
          )}
        </section>

        <section className="section pb-16">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink)] text-[#F6EFE4] p-7 md:p-9 flex flex-col md:flex-row md:items-center justify-between gap-5 overflow-hidden relative">
            <div className="absolute -right-16 -top-24 w-64 h-64 rounded-full bg-[var(--accent)] blur-3xl opacity-30" />
            <div className="relative">
              <h2 className="font-[var(--font-display)] text-[28px] md:text-[34px] tracking-[-0.04em] font-semibold m-0 leading-none">
                Make the thing. <span className="text-[#FFC56E]">Then share it.</span>
              </h2>
              <p className="text-[12px] text-white/55 mt-2.5 mb-0 max-w-[520px]">
                Invite a collaborator with a link, leave comments on the details, then export a PDF,
                GIF or a short video — without leaving the tab.
              </p>
            </div>
            <button type="button" className="btn btn-accent shrink-0 relative" onClick={() => setNewOpen(true)}>
              Open the studio <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] bg-[var(--paper)]">
        <div className="max-w-[1380px] mx-auto px-7 py-10 grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
          <div>
            <Brand />
            <p className="text-[11px] leading-relaxed text-[var(--muted)] mt-3 max-w-[300px]">
              An open-source design studio for the browser. Built with Next.js, Konva, Yjs and a
              stubborn belief that creative tools should be yours.
            </p>
            <span className="badge mt-3">MIT licensed</span>
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--muted)] mb-2.5">Create</h3>
            {["Social posts", "Stories", "Posters", "Presentations", "Resumes"].map((x) => (
              <button key={x} type="button" className="block text-[11px] text-[var(--ink-soft)] py-1 hover:text-[var(--accent)]" onClick={() => setNewOpen(true)}>
                {x}
              </button>
            ))}
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--muted)] mb-2.5">Built with</h3>
            {["Next.js 16", "React 19", "Konva 10", "Yjs + MQTT", "Tailwind 4"].map((x) => (
              <span key={x} className="block text-[11px] text-[var(--ink-soft)] py-1">{x}</span>
            ))}
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--muted)] mb-2.5">Studio</h3>
            <button type="button" className="block text-[11px] text-[var(--ink-soft)] py-1 hover:text-[var(--accent)]" onClick={() => setNewOpen(true)}>New design</button>
            <button type="button" className="block text-[11px] text-[var(--ink-soft)] py-1 hover:text-[var(--accent)]" onClick={() => setAccountOpen(true)}>Account</button>
            <a href="#templates" className="block text-[11px] text-[var(--ink-soft)] py-1 hover:text-[var(--accent)]">Templates</a>
            <span className="block text-[10px] text-[var(--muted-2)] mt-2">Photos: Lorem Picsum / Unsplash</span>
          </div>
        </div>
        <div className="border-t border-[var(--line)]">
          <div className="max-w-[1380px] mx-auto px-7 py-4 flex items-center justify-between text-[10px] text-[var(--muted-2)]">
            <span>© {new Date().getFullYear()} Levele contributors</span>
            <span>Made for the open web.</span>
          </div>
        </div>
      </footer>

      <NewDesignDialog open={newOpen} onClose={() => setNewOpen(false)} onCreate={(p) => void createBlank(p)} />
      <AccountDialog
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        profile={profile}
        onProfile={(p) => {
          setProfile(p);
          void refresh();
        }}
        onChanged={() => void refresh()}
        toast={toast}
      />
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
