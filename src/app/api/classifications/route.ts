/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import googleSheetsService from "@/lib/googleSheetsService";
import { DATASETS, isKnownDataset } from "@/lib/datasetConfig";

// Path to the file where classifications will be stored locally as a backup
// For Vercel deployment, we'll use a different location since the filesystem is read-only except /tmp
function getClassificationsFile(datasetId: keyof typeof DATASETS) {
  const fileName = `classifications_${datasetId}.json`;
  return process.env.VERCEL
    ? path.join("/tmp", fileName)
    : path.join(process.cwd(), fileName);
}

// Initialize with an empty classifications object if the file doesn't exist
// Use try-catch because in Vercel, the parent directory might not exist initially
function ensureFileExists(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify({ classifications: {} }));
    }
  } catch (error) {
    console.error("Error initializing classifications file:", error);
  }
}

// Function to read classifications from the local file
const readClassifications = (filePath: string) => {
  try {
    // For Vercel, we might want to read from Google Sheets if local file doesn't exist
    if (
      !fs.existsSync(filePath) &&
      process.env.VERCEL &&
      googleSheetsService.getStatus().isConfigured
    ) {
      // If running on Vercel and Google Sheets is configured, but no local file exists yet
      console.log(
        "No local classifications found, attempting to fetch from Google Sheets"
      );
      return { classifications: {} }; // Return empty for now, Google Sheets data will be fetched separately
    }

    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading classifications file:", error);
    return { classifications: {} };
  }
};

// Function to write classifications to the local file
const writeClassifications = (filePath: string, data: any) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing classifications file:", error);
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetParam = searchParams.get("dataset");
    const datasetId =
      datasetParam && isKnownDataset(datasetParam)
        ? datasetParam
        : (Object.keys(DATASETS)[0] as keyof typeof DATASETS);
    const filePath = getClassificationsFile(datasetId);
    ensureFileExists(filePath);

    // Always prioritize local data
    const localData = readClassifications(filePath);

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
        const sheetsResult = await googleSheetsService.readSheet(
          DATASETS[datasetId].sheetTabName,
          datasetId
        );
        if (sheetsResult.success) {
          localData.classifications = sheetsResult.data;
          // Save to local file
          writeClassifications(filePath, localData);
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
    const { searchParams } = new URL(request.url);
    const datasetParam = searchParams.get("dataset");
    const datasetId =
      datasetParam && isKnownDataset(datasetParam)
        ? datasetParam
        : (Object.keys(DATASETS)[0] as keyof typeof DATASETS);
    const filePath = getClassificationsFile(datasetId);
    ensureFileExists(filePath);

    if (!imagePath) {
      return NextResponse.json(
        { error: "Image path is required" },
        { status: 400 }
      );
    }

    const currentData = readClassifications(filePath);

    // Update or remove the classification
    if (classification) {
      currentData.classifications[imagePath] = classification;
    } else {
      delete currentData.classifications[imagePath];
    }

    // Save to local file
    writeClassifications(filePath, currentData);

    // Get Google Sheets status
    const sheetsStatus = googleSheetsService.getStatus();

    // Update Google Sheet if configured
    let googleSheetsSuccess = false;
    let googleSheetsMessage = "Google Sheets not configured";

    if (sheetsStatus.isConfigured) {
      const result = await googleSheetsService.updateSheet(
        currentData.classifications,
        DATASETS[datasetId].sheetTabName,
        datasetId
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
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetParam = searchParams.get("dataset");
    const datasetId =
      datasetParam && isKnownDataset(datasetParam)
        ? datasetParam
        : (Object.keys(DATASETS)[0] as keyof typeof DATASETS);
    const filePath = getClassificationsFile(datasetId);
    ensureFileExists(filePath);
    const emptyData = { classifications: {} };

    // Save to local file
    writeClassifications(filePath, emptyData);

    // Get Google Sheets status
    const sheetsStatus = googleSheetsService.getStatus();

    // Update Google Sheet if configured
    let googleSheetsSuccess = false;
    let googleSheetsMessage = "Google Sheets not configured";

    if (sheetsStatus.isConfigured) {
      const result = await googleSheetsService.updateSheet(
        {},
        DATASETS[datasetId].sheetTabName,
        datasetId
      );
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
