import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import googleSheetsService from "@/lib/googleSheetsService";

const TELEMETRY_DIR = path.join(process.cwd(), ".telemetry");
const TELEMETRY_FILE = path.join(TELEMETRY_DIR, "events.ndjson");

function ensureTelemetryFile() {
  if (!fs.existsSync(TELEMETRY_DIR)) {
    fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  }
  if (!fs.existsSync(TELEMETRY_FILE)) {
    fs.writeFileSync(TELEMETRY_FILE, "");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];

    ensureTelemetryFile();

    const lines =
      events
        .filter((e) => e && typeof e === "object")
        .map((e) => ({ ...e, serverTs: Date.now() }))
        .map((e) => JSON.stringify(e))
        .join("\n") + "\n";

    fs.appendFileSync(TELEMETRY_FILE, lines);

    const sheetsStatus = googleSheetsService.getStatus();
    if (sheetsStatus.isConfigured) {
      await googleSheetsService.appendTelemetry(events);
    }

    return NextResponse.json({
      success: true,
      count: events.length,
      sheets: sheetsStatus,
    });
  } catch (err) {
    console.error("Telemetry POST error", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
