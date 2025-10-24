import { NextRequest, NextResponse } from "next/server";
import googleSheetsService from "@/lib/googleSheetsService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];

    // Add server timestamp to events
    const enrichedEvents = events
      .filter((e) => e && typeof e === "object")
      .map((e) => ({ ...e, serverTs: Date.now() }));

    const sheetsStatus = googleSheetsService.getStatus();

    let sheetsResult = null;
    if (sheetsStatus.isConfigured) {
      try {
        sheetsResult = await googleSheetsService.appendTelemetry(
          enrichedEvents
        );
      } catch (sheetsError) {
        sheetsResult = {
          success: false,
          message: `Sheets error: ${sheetsError}`,
        };
      }
    }

    return NextResponse.json({
      success: true,
      count: events.length,
      sheets: sheetsStatus,
      sheetsResult,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
