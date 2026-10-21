"use client";

import type { MqttClient } from "mqtt";
import * as Y from "yjs";
import { randomBytes } from "@/lib/editor/random";

const DEFAULT_BROKER = "wss://broker.emqx.io:8084/mqtt";
const REMOTE_ORIGIN = "levele-mqtt-remote";
const STATE_MAX_BYTES = 900_000;

// mqtt.js accepts Uint8Array in browsers; its published types require Buffer.
const mqttPayload = (data: Uint8Array): Buffer => data as unknown as Buffer;

const sha256 = async (text: string) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

type LocalState = {
  user?: { id: string; name: string; color: string };
  presence?: { pageId: string; selection: string[]; cursor?: { x: number; y: number } };
};

type AwarenessValue = LocalState & { clientID: number; ts: number; gone?: boolean; room?: string };

class Awareness {
  readonly clientID: number;
  private local: LocalState = {};
  private remote = new Map<number, { state: AwarenessValue; seen: number }>();
  private listeners = new Set<() => void>();
  private provider: MqttProvider;

  constructor(provider: MqttProvider, clientID: number) {
    this.provider = provider;
    this.clientID = clientID;
  }

  setLocalStateField(field: keyof LocalState, value: unknown) {
    this.local = { ...this.local, [field]: value };
    this.provider.publishAwareness(this.exportLocal());
    this.emit();
  }

  exportLocal(): AwarenessValue {
    return { ...this.local, clientID: this.clientID, ts: Date.now() };
  }

  receive(state: AwarenessValue) {
    if (!state || state.clientID == null || state.clientID === this.clientID) return;
    if (state.gone) {
      this.remote.delete(state.clientID);
    } else {
      this.remote.set(state.clientID, { state, seen: Date.now() });
    }
    this.emit();
  }

  prune(maxAgeMs = 25_000) {
    const now = Date.now();
    let changed = false;
    for (const [id, entry] of this.remote) {
      if (now - entry.seen > maxAgeMs) {
        this.remote.delete(id);
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  getStates() {
    const states = new Map<number, LocalState>();
    states.set(this.clientID, this.local);
    for (const [id, entry] of this.remote) states.set(id, entry.state);
    return states;
  }

  on(_event: "change", listener: () => void) {
    this.listeners.add(listener);
  }

  off(_event: "change", listener: () => void) {
    this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  destroy() {
    this.listeners.clear();
    this.remote.clear();
  }
}

export class MqttProvider {
  readonly ydoc: Y.Doc;
  readonly roomName: string;
  readonly awareness: Awareness;
  connected = false;
  synced = false;

  private client: MqttClient | null = null;
  private channel: BroadcastChannel | null = null;
  private clientId = `levele_${randomBytes(12)}`;
  private topicBase = "";
  // The relay is public, so payloads are AES-GCM sealed with a key derived from the room secret.
  private key: CryptoKey | null = null;
  private docHandler: (update: Uint8Array, origin: unknown) => void;
  private stateTimer: ReturnType<typeof setTimeout> | null = null;
  private publishStateTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private syncedListeners = new Set<() => void>();

  constructor(roomName: string, ydoc: Y.Doc) {
    this.roomName = roomName;
    this.ydoc = ydoc;
    this.awareness = new Awareness(this, Number(`0x${randomBytes(6)}`));

    this.docHandler = (update, origin) => {
      if (origin === REMOTE_ORIGIN) return;
      void this.publishUpdate(update);
      this.scheduleStatePublish();
      // Republish awareness so peers see this session as active.
      this.publishAwareness(this.awareness.exportLocal());
    };
    ydoc.on("update", this.docHandler);

    try {
      this.channel = new BroadcastChannel(`levele-${roomName}`);
      this.channel.onmessage = (event) => this.handleBroadcast(event.data);
    } catch {
      this.channel = null;
    }
  }

  connect() {
    if (this.destroyed) return;
    void this.connectMqtt();
  }

  private async connectMqtt() {
    try {
      const mqtt = (await import("mqtt")).default;
      this.topicBase = `levele/v2/${toHex(await sha256(`levele-topic:${this.roomName}`)).slice(0, 32)}`;
      this.key = await crypto.subtle.importKey(
        "raw",
        await sha256(`levele-key:${this.roomName}`),
        "AES-GCM",
        false,
        ["encrypt", "decrypt"],
      );
      if (this.destroyed) return;
      const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_URL || DEFAULT_BROKER, {
        clientId: this.clientId,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 12_000,
        keepalive: 30,
        protocolVersion: 4,
      });
      this.client = client;

      client.on("connect", () => {
        this.connected = true;
        this.synced = true;
        try {
          client.subscribe(
            [
              `${this.topicBase}/doc`,
              `${this.topicBase}/state`,
              `${this.topicBase}/sync`,
              `${this.topicBase}/awareness/+`,
            ],
            { qos: 0 },
            () => undefined,
          );
        } catch {
          /* connection closed before the subscription was sent */
        }
        this.publishAwareness(this.awareness.exportLocal());
        this.publishFullState(true);
        client.publish(`${this.topicBase}/sync`, "request", { qos: 0 });
        this.syncedListeners.forEach((fn) => fn());
      });

      client.on("message", (topic, payload) => void this.handleMqtt(topic, payload));
      client.on("error", (err) => {
        console.warn("Levele live sync:", err.message);
      });
      client.on("close", () => {
        this.connected = false;
      });
      client.on("reconnect", () => {
        this.connected = false;
      });

      this.heartbeatTimer = setInterval(() => {
        if (this.connected) this.publishAwareness(this.awareness.exportLocal());
      }, 6000);
      this.publishStateTimer = setInterval(() => {
        if (this.connected) this.publishFullState(true);
      }, 20_000);
      this.pruneTimer = setInterval(() => this.awareness.prune(), 9000);
    } catch (err) {
      console.warn("Levele live sync unavailable", err);
    }
  }

  onSynced(listener: () => void) {
    this.syncedListeners.add(listener);
    if (this.synced) listener();
    return () => this.syncedListeners.delete(listener);
  }

  private applyRemote(update: Uint8Array) {
    try {
      Y.applyUpdate(this.ydoc, update, REMOTE_ORIGIN);
    } catch (err) {
      console.warn("Could not apply remote update", err);
    }
  }

  private async seal(data: Uint8Array) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.key!, new Uint8Array(data)));
    const out = new Uint8Array(iv.length + sealed.length);
    out.set(iv);
    out.set(sealed, iv.length);
    return out;
  }

  private async open(payload: Uint8Array): Promise<Uint8Array | null> {
    if (!this.key || payload.length < 13) return null;
    try {
      return new Uint8Array(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: payload.slice(0, 12) },
          this.key,
          payload.slice(12),
        ),
      );
    } catch {
      return null; // wrong key or tampered: ignore
    }
  }

  private async publishSealed(topic: string, data: Uint8Array, options: { qos?: 0 | 1 | 2; retain?: boolean }) {
    if (!this.key) return;
    this.safePublish(topic, mqttPayload(await this.seal(data)), options);
  }

  private safePublish(
    topic: string,
    payload: string | Buffer,
    options: { qos?: 0 | 1 | 2; retain?: boolean },
  ) {
    const client = this.client;
    if (!client || !client.connected || client.disconnecting || client.disconnected) return;
    try {
      client.publish(topic, payload, options);
    } catch {
      /* the socket can disappear during navigation */
    }
  }

  private publishUpdate(update: Uint8Array) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type: "update", data: update });
      } catch {
        /* channel closed */
      }
    }
    void this.publishSealed(`${this.topicBase}/doc`, update, { qos: 0 });
  }

  private scheduleStatePublish() {
    if (this.stateTimer) clearTimeout(this.stateTimer);
    this.stateTimer = setTimeout(() => this.publishFullState(true), 900);
  }

  private publishFullState(retain: boolean) {
    // A joiner still waiting for the design must not overwrite the retained copy with nothing.
    if (!this.ydoc.getMap("pages").size) return;
    const update = Y.encodeStateAsUpdate(this.ydoc);
    if (update.byteLength > STATE_MAX_BYTES) {
      // Large uploads can't be stored as retained state; peers still receive
      // incremental updates while connected.
      return this.publishSealed(`${this.topicBase}/state`, update, { qos: 0, retain: false });
    }
    if (this.channel) {
      try {
        this.channel.postMessage({ type: "state", data: update });
      } catch {
        /* closed */
      }
    }
    return this.publishSealed(`${this.topicBase}/state`, update, { qos: 0, retain });
  }

  publishAwareness(state: AwarenessValue) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type: "awareness", data: state });
      } catch {
        /* closed */
      }
    }
    // Not retained: the 6s heartbeat rebuilds presence, and retained copies would pile up per tab.
    return this.publishSealed(
      `${this.topicBase}/awareness/${this.clientId}`,
      new TextEncoder().encode(JSON.stringify(state)),
      { qos: 0 },
    );
  }

  private handleBroadcast(message: { type: string; data: unknown }) {
    if (!message || typeof message !== "object") return;
    if (message.type === "update" && message.data instanceof Uint8Array) {
      this.applyRemote(message.data);
    } else if (message.type === "state" && message.data instanceof Uint8Array) {
      this.applyRemote(message.data);
    } else if (message.type === "awareness" && message.data) {
      this.awareness.receive(message.data as AwarenessValue);
    } else if (message.type === "sync-request") {
      this.publishFullState(true);
      this.publishAwareness(this.awareness.exportLocal());
    }
  }

  private async handleMqtt(topic: string, payload: Uint8Array) {
    if (topic.endsWith("/doc") || topic.endsWith("/state")) {
      const update = await this.open(new Uint8Array(payload));
      if (update) this.applyRemote(update);
    } else if (topic.endsWith("/sync")) {
      if (new TextDecoder().decode(payload) === "request") {
        this.publishFullState(true);
        this.publishAwareness(this.awareness.exportLocal());
        if (this.channel) {
          try {
            this.channel.postMessage({ type: "sync-request" });
          } catch {
            /* closed */
          }
        }
      }
    } else if (topic.includes("/awareness/")) {
      const data = await this.open(new Uint8Array(payload));
      if (!data) return;
      try {
        this.awareness.receive(JSON.parse(new TextDecoder().decode(data)) as AwarenessValue);
      } catch {
        /* malformed */
      }
    }
  }

  /** `forget` also deletes the retained encrypted copy, used when the live session is ended. */
  destroy(forget = false) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.ydoc.off("update", this.docHandler);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.publishStateTimer) clearInterval(this.publishStateTimer);
    if (this.pruneTimer) clearInterval(this.pruneTimer);
    if (this.stateTimer) clearTimeout(this.stateTimer);
    const client = this.client;
    // Sealing is async, so close the socket only after the farewell messages are queued.
    void Promise.all([
      forget
        ? this.safePublish(`${this.topicBase}/state`, "", { qos: 0, retain: true }) // empty retained = delete
        : this.publishFullState(true),
      this.publishAwareness({ ...this.awareness.exportLocal(), gone: true, ts: Date.now() }),
    ]).finally(() => {
      try {
        client?.end(false);
      } catch {
        /* already closing */
      }
      this.client = null;
    });
    this.awareness.destroy();
    this.syncedListeners.clear();
    this.channel?.close();
    this.channel = null;
  }
}
