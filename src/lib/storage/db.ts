import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AccountRecord, AssetRecord, DesignDoc, StoredDoc } from "@/lib/editor/types";

interface LeveleDB extends DBSchema {
  docs: {
    key: string;
    value: StoredDoc;
    indexes: { "by-updated": number; "by-owner": string };
  };
  accounts: {
    key: string;
    value: AccountRecord;
    indexes: { "by-email": string };
  };
  assets: {
    key: string;
    value: AssetRecord;
    indexes: { "by-owner": string; "by-created": number };
  };
}

let dbPromise: Promise<IDBPDatabase<LeveleDB>> | null = null;

const db = () => {
  if (typeof window === "undefined") throw new Error("IndexedDB is browser-only");
  if (!dbPromise) {
    dbPromise = openDB<LeveleDB>("levele", 1, {
      upgrade(database) {
        const docs = database.createObjectStore("docs", { keyPath: "id" });
        docs.createIndex("by-updated", "updatedAt");
        docs.createIndex("by-owner", "ownerId");
        const accounts = database.createObjectStore("accounts", { keyPath: "id" });
        accounts.createIndex("by-email", "email", { unique: true });
        const assets = database.createObjectStore("assets", { keyPath: "id" });
        assets.createIndex("by-owner", "ownerId");
        assets.createIndex("by-created", "createdAt");
      },
    });
  }
  return dbPromise;
};

export async function saveDocRecord(
  doc: DesignDoc,
  ownerId: string,
  thumbnail?: string,
  sync?: Pick<StoredDoc, "yState" | "roomKey">,
): Promise<StoredDoc> {
  const database = await db();
  const existing = await database.get("docs", doc.id);
  const record: StoredDoc = {
    id: doc.id,
    title: doc.title,
    ownerId,
    docType: doc.docType,
    width: doc.width,
    height: doc.height,
    pageCount: doc.pages.length,
    createdAt: existing?.createdAt ?? doc.createdAt,
    updatedAt: Date.now(),
    thumbnail: thumbnail ?? existing?.thumbnail,
    doc,
    // The editor session owns sync fields (an absent roomKey means the live session ended).
    ...(sync ?? { yState: existing?.yState, roomKey: existing?.roomKey }),
  };
  await database.put("docs", record);
  return record;
}

export async function getDocRecord(id: string): Promise<StoredDoc | undefined> {
  return (await db()).get("docs", id);
}

export async function listDocRecords(ownerId: string): Promise<StoredDoc[]> {
  const database = await db();
  const all = await database.getAllFromIndex("docs", "by-owner", ownerId);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteDocRecord(id: string): Promise<void> {
  await (await db()).delete("docs", id);
}

export async function updateDocOwner(id: string, ownerId: string): Promise<void> {
  const database = await db();
  const rec = await database.get("docs", id);
  if (rec) await database.put("docs", { ...rec, ownerId });
}

export async function getAccountByEmail(email: string): Promise<AccountRecord | undefined> {
  return (await db()).getFromIndex("accounts", "by-email", email.toLowerCase());
}

export async function getAccount(id: string): Promise<AccountRecord | undefined> {
  return (await db()).get("accounts", id);
}

export async function putAccount(account: AccountRecord): Promise<void> {
  await (await db()).put("accounts", account);
}

export async function listAssets(ownerId: string): Promise<AssetRecord[]> {
  const database = await db();
  const all = await database.getAllFromIndex("assets", "by-owner", ownerId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveAsset(asset: AssetRecord): Promise<void> {
  await (await db()).put("assets", asset);
}

export async function deleteAsset(id: string): Promise<void> {
  await (await db()).delete("assets", id);
}
