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
    return doc;
  } catch {
    return null;
  }
};

export function buildShareLinks(doc: DesignDoc, origin: string) {
  const snapshot = encodeSnapshot(doc);
  const tooLarge = snapshot.length > LIMIT;
  const base = origin.replace(/\/$/, "");
  const seed = tooLarge ? "" : `&snapshot=${snapshot}`;
  return {
    live: `${base}/editor/${doc.id}?room=${encodeURIComponent(doc.id)}${seed}`,
    copy: tooLarge
      ? null
      : `${base}/editor/${doc.id}?copy=1&snapshot=${snapshot}`,
    snapshotSize: snapshot.length,
    tooLarge,
  };
}
