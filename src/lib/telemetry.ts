/* eslint-disable @typescript-eslint/no-explicit-any */
type TelemetryEvent = Record<string, any> & {
  type: string;
  ts?: number;
  sessionId?: string;
};

class Telemetry {
  private buffer: TelemetryEvent[] = [];
  private flushIntervalId: number | null = null;
  private readonly sessionId: string;
  private readonly endpoint = "/api/telemetry";
  private readonly maxBatchSize = 25;
  private readonly flushMs = 5000;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    if (typeof window !== "undefined") {
      this.startAutoFlush();
      window.addEventListener("beforeunload", () => {
        this.flush({ useBeacon: true });
      });
    }
  }

  private getOrCreateSessionId(): string {
    try {
      const key = "telemetry_session_id";
      const existing =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(key)
          : null;
      if (existing) return existing;
      const sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (typeof window !== "undefined")
        window.sessionStorage.setItem(key, sid);
      return sid;
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  record(event: TelemetryEvent) {
    const enriched: TelemetryEvent = {
      ...event,
      ts: Date.now(),
      sessionId: this.sessionId,
      ua: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
    this.buffer.push(enriched);
    if (this.buffer.length >= this.maxBatchSize) this.flush();
  }

  startAutoFlush() {
    if (this.flushIntervalId != null) return;
    this.flushIntervalId = window.setInterval(() => this.flush(), this.flushMs);
  }

  stopAutoFlush() {
    if (this.flushIntervalId != null) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
  }

  async flush(options?: { useBeacon?: boolean }) {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.buffer.length);
    try {
      if (
        options?.useBeacon &&
        typeof navigator !== "undefined" &&
        "sendBeacon" in navigator
      ) {
        const blob = new Blob([JSON.stringify(batch)], {
          type: "application/json",
        });
        navigator.sendBeacon(this.endpoint, blob);
        return;
      }
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
        keepalive: true,
      });
    } catch {
      // requeue on failure
      this.buffer.unshift(...batch);
    }
  }
}

const telemetry = new Telemetry();
export default telemetry;
export type { TelemetryEvent };
