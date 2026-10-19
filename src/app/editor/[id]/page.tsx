import { Suspense } from "react";
import EditorShell from "@/components/editor/EditorShell";

export const metadata = {
  title: "Design studio",
};

function EditorFallback() {
  return (
    <div className="editor-shell">
      <div className="flex-1 grid place-items-center">
        <div className="text-center">
          <div className="brand justify-center text-[24px] mb-3">
            <span className="brand-mark">
              <svg width="17" height="17" viewBox="0 0 64 64" fill="none">
                <path d="M18 16h9v23h19v9H18z" fill="#F6EFE4" />
                <circle cx="46" cy="18" r="6" fill="#FF5A36" />
              </svg>
            </span>
            Levele
          </div>
          <p className="text-[11px] text-[var(--muted)]">Opening your studio…</p>
        </div>
      </div>
    </div>
  );
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<EditorFallback />}>
      <EditorShell docId={id} />
    </Suspense>
  );
}
