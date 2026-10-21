import LZString from "lz-string";
import type { DesignDoc } from "./editor/types";

const LIMIT = 12000;

export const encodeSnapshot = (doc: DesignDoc) =>
  LZString.compressToEncodedURIComponent(JSON.stringify(doc));

export const decodeSnapshot = (encoded: string): DesignDoc | null => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const doc = JSON.parse(json) as DesignDoc;
    if (!doc || !Array.isArray(doc.pages) || !Array.isArray(doc.elements)) return null;
    doc.comments ??= [];
    return doc;
  } catch {
    return null;
  }
};

// Everything after `#` stays in the browser: no server log or relay ever sees the design or key.
export function buildShareLinks(doc: DesignDoc, origin: string, roomKey?: string) {
  const snapshot = encodeSnapshot(doc);
  const tooLarge = snapshot.length > LIMIT;
  const base = origin.replace(/\/$/, "");
  return {
    live: roomKey ? `${base}/editor/${doc.id}#room=${roomKey}` : null,
    copy: tooLarge ? null : `${base}/editor/${doc.id}#copy=1&snapshot=${snapshot}`,
    snapshotSize: snapshot.length,
    tooLarge,
  };
}
