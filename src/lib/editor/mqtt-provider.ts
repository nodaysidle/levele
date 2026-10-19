"use client";

import type { MqttClient } from "mqtt";
import * as Y from "yjs";
import { randomBytes } from "@/lib/editor/random";

const DEFAULT_BROKER = "wss://broker.emqx.io:8084/mqtt";
const REMOTE_ORIGIN = "levele-mqtt-remote";
const STATE_MAX_BYTES = 900_000;

// mqtt.js accepts Uint8Array in browsers; its published types require Buffer.
const mqttPayload = (data: Uint8Array): Buffer => data as unknown as Buffer;

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
  private topicBase: string;
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
    this.topicBase = `levele/v1/${roomName.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
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

      client.on("message", (topic, payload) => this.handleMqtt(topic, payload));
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
    this.safePublish(`${this.topicBase}/doc`, mqttPayload(update), { qos: 0 });
  }

  private scheduleStatePublish() {
    if (this.stateTimer) clearTimeout(this.stateTimer);
    this.stateTimer = setTimeout(() => this.publishFullState(true), 900);
  }

  private publishFullState(retain: boolean) {
    const update = Y.encodeStateAsUpdate(this.ydoc);
    if (update.byteLength > STATE_MAX_BYTES) {
      // Large uploads can't be stored as retained state; peers still receive
      // incremental updates while connected.
      this.safePublish(`${this.topicBase}/state`, mqttPayload(update), { qos: 0, retain: false });
      return;
    }
    if (this.channel) {
      try {
        this.channel.postMessage({ type: "state", data: update });
      } catch {
        /* closed */
      }
    }
    this.safePublish(`${this.topicBase}/state`, mqttPayload(update), { qos: 0, retain });
  }

  publishAwareness(state: AwarenessValue) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type: "awareness", data: state });
      } catch {
        /* closed */
      }
    }
    this.safePublish(
      `${this.topicBase}/awareness/${this.clientId}`,
      JSON.stringify(state),
      { qos: 0, retain: true },
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

  private handleMqtt(topic: string, payload: Uint8Array) {
    if (topic.endsWith("/doc") || topic.endsWith("/state")) {
      this.applyRemote(new Uint8Array(payload));
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
      try {
        this.awareness.receive(JSON.parse(new TextDecoder().decode(payload)) as AwarenessValue);
      } catch {
        /* malformed */
      }
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.ydoc.off("update", this.docHandler);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.publishStateTimer) clearInterval(this.publishStateTimer);
    if (this.pruneTimer) clearInterval(this.pruneTimer);
    if (this.stateTimer) clearTimeout(this.stateTimer);
    this.publishFullState(true);
    this.publishAwareness({ ...this.awareness.exportLocal(), gone: true, ts: Date.now() });
    this.awareness.destroy();
    this.syncedListeners.clear();
    this.channel?.close();
    this.channel = null;
    try {
      this.client?.end(false);
    } catch {
      /* already closing */
    }
    this.client = null;
  }
}

export const REMOTE_SYNC_ORIGIN = REMOTE_ORIGIN;
