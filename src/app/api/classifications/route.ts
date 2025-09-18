/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import googleSheetsService from "@/lib/googleSheetsService";

// Path to the file where classifications will be stored locally as a backup
// For Vercel deployment, we'll use a different location since the filesystem is read-only except /tmp
const CLASSIFICATIONS_FILE = process.env.VERCEL
  ? path.join("/tmp", "classifications.json")
  : path.join(process.cwd(), "classifications.json");

// Initialize with an empty classifications object if the file doesn't exist
// Use try-catch because in Vercel, the parent directory might not exist initially
try {
  if (!fs.existsSync(CLASSIFICATIONS_FILE)) {
    // Make sure the directory exists
    const dir = path.dirname(CLASSIFICATIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      CLASSIFICATIONS_FILE,
      JSON.stringify({ classifications: {} })
    );
  }
} catch (error) {
  console.error("Error initializing classifications file:", error);
}

// Function to read classifications from the local file
const readClassifications = () => {
  try {
    // For Vercel, we might want to read from Google Sheets if local file doesn't exist
    if (
      !fs.existsSync(CLASSIFICATIONS_FILE) &&
      process.env.VERCEL &&
      googleSheetsService.getStatus().isConfigured
    ) {
      // If running on Vercel and Google Sheets is configured, but no local file exists yet
      console.log(
        "No local classifications found, attempting to fetch from Google Sheets"
      );
      return { classifications: {} }; // Return empty for now, Google Sheets data will be fetched separately
    }

    const data = fs.readFileSync(CLASSIFICATIONS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading classifications file:", error);
    return { classifications: {} };
  }
};

// Function to write classifications to the local file
const writeClassifications = (data: any) => {
  try {
    fs.writeFileSync(CLASSIFICATIONS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing classifications file:", error);
  }
};

export async function GET() {
  try {
    // Always prioritize local data
    const localData = readClassifications();

    // Get Google Sheets status for client information
    const sheetsStatus = googleSheetsService.getStatus();

    // If on Vercel and Google Sheets is configured, try to fetch data from Google Sheets
    if (
      process.env.VERCEL &&
      sheetsStatus.isConfigured &&
      Object.keys(localData.classifications).length === 0
    ) {
      try {
        console.log("Attempting to fetch classifications from Google Sheets");
        const sheetsResult = await googleSheetsService.readSheet();
        if (sheetsResult.success) {
          localData.classifications = sheetsResult.data;
          // Save to local file
          writeClassifications(localData);
        }
      } catch (error) {
        console.error("Error fetching from Google Sheets:", error);
      }
    }

    return NextResponse.json({
      ...localData,
      googleSheets: {
        isConfigured: sheetsStatus.isConfigured,
        message: sheetsStatus.message,
      },
    });
  } catch (error) {
    console.error("Error reading classifications:", error);
    return NextResponse.json(
      { error: "Failed to read classifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { imagePath, classification } = data;

    if (!imagePath) {
      return NextResponse.json(
        { error: "Image path is required" },
        { status: 400 }
      );
    }

    const currentData = readClassifications();

    // Update or remove the classification
    if (classification) {
      currentData.classifications[imagePath] = classification;
    } else {
      delete currentData.classifications[imagePath];
    }

    // Save to local file
    writeClassifications(currentData);

    // Get Google Sheets status
    const sheetsStatus = googleSheetsService.getStatus();

    // Update Google Sheet if configured
    let googleSheetsSuccess = false;
    let googleSheetsMessage = "Google Sheets not configured";

    if (sheetsStatus.isConfigured) {
      const result = await googleSheetsService.updateSheet(
        currentData.classifications
      );
      googleSheetsSuccess = result.success;
      googleSheetsMessage = result.message;
    } else {
      googleSheetsMessage = sheetsStatus.message;
    }

    return NextResponse.json({
      success: true,
      localSaveSuccess: true,
      googleSheets: {
        isConfigured: sheetsStatus.isConfigured,
        updateSuccess: googleSheetsSuccess,
        message: googleSheetsMessage,
      },
    });
  } catch (error) {
    console.error("Error saving classification:", error);
    return NextResponse.json(
      { error: "Failed to save classification" },
      { status: 500 }
    );
  }
}

// Reset all classifications
export async function DELETE() {
  try {
    const emptyData = { classifications: {} };

    // Save to local file
    writeClassifications(emptyData);

    // Get Google Sheets status
    const sheetsStatus = googleSheetsService.getStatus();

    // Update Google Sheet if configured
    let googleSheetsSuccess = false;
    let googleSheetsMessage = "Google Sheets not configured";

    if (sheetsStatus.isConfigured) {
      const result = await googleSheetsService.updateSheet({});
      googleSheetsSuccess = result.success;
      googleSheetsMessage = result.message;
    } else {
      googleSheetsMessage = sheetsStatus.message;
    }

    return NextResponse.json({
      success: true,
      localResetSuccess: true,
      googleSheets: {
        isConfigured: sheetsStatus.isConfigured,
        updateSuccess: googleSheetsSuccess,
        message: googleSheetsMessage,
      },
    });
  } catch (error) {
    console.error("Error resetting classifications:", error);
    return NextResponse.json(
      { error: "Failed to reset classifications" },
      { status: 500 }
    );
  }
}
