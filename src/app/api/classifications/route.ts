import { NextRequest, NextResponse } from "next/server";
import googleSheetsService from "@/lib/googleSheetsService";
import { DATASETS, isKnownDataset } from "@/lib/datasetConfig";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetParam = searchParams.get("dataset");
    const labeler = searchParams.get("labeler")?.toLowerCase() || "";
    const datasetId =
      datasetParam && isKnownDataset(datasetParam)
        ? datasetParam
        : (Object.keys(DATASETS)[0] as keyof typeof DATASETS);

    // Get Google Sheets status for client information
    const sheetsStatus = googleSheetsService.getStatus();

    // Try to fetch data from Google Sheets
    let classifications = {};
    if (sheetsStatus.isConfigured) {
      try {
        const sheetsResult = await googleSheetsService.readSheet(
          labeler
            ? `${DATASETS[datasetId].sheetTabName}_${labeler}`
            : DATASETS[datasetId].sheetTabName,
          datasetId
        );
        if (sheetsResult.success) {
          classifications = sheetsResult.data;
        }
      } catch (error) {
        console.error("Error fetching from Google Sheets:", error);
      }
    }

    return NextResponse.json({
      classifications,
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
    const labeler = searchParams.get("labeler")?.toLowerCase() || "";
    const datasetId =
      datasetParam && isKnownDataset(datasetParam)
        ? datasetParam
        : (Object.keys(DATASETS)[0] as keyof typeof DATASETS);

    if (!imagePath) {
      return NextResponse.json(
        { error: "Image path is required" },
        { status: 400 }
      );
    }

    // Get Google Sheets status
    const sheetsStatus = googleSheetsService.getStatus();

    // Update Google Sheet if configured
    let googleSheetsSuccess = false;
    let googleSheetsMessage = "Google Sheets not configured";

    if (sheetsStatus.isConfigured) {
      if (classification) {
        const result = await googleSheetsService.updateSheetSingleRow(
          imagePath,
          classification,
          labeler
            ? `${DATASETS[datasetId].sheetTabName}_${labeler}`
            : DATASETS[datasetId].sheetTabName,
          datasetId
        );

        googleSheetsSuccess = result.success;
        googleSheetsMessage = result.message;
      } else {
        // For removing classifications, we need to get current data first
        const currentDataResult = await googleSheetsService.readSheet(
          labeler
            ? `${DATASETS[datasetId].sheetTabName}_${labeler}`
            : DATASETS[datasetId].sheetTabName,
          datasetId
        );

        if (currentDataResult.success) {
          const currentData = currentDataResult.data;
          delete currentData[imagePath];

          const result = await googleSheetsService.updateSheet(
            currentData,
            labeler
              ? `${DATASETS[datasetId].sheetTabName}_${labeler}`
              : DATASETS[datasetId].sheetTabName,
            datasetId
          );

          googleSheetsSuccess = result.success;
          googleSheetsMessage = result.message;
        } else {
          googleSheetsMessage = "Failed to read current data for removal";
        }
      }
    } else {
      googleSheetsMessage = sheetsStatus.message;
    }

    return NextResponse.json({
      success: googleSheetsSuccess,
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
    const labeler = searchParams.get("labeler")?.toLowerCase() || "";
    const datasetId =
      datasetParam && isKnownDataset(datasetParam)
        ? datasetParam
        : (Object.keys(DATASETS)[0] as keyof typeof DATASETS);

    // Get Google Sheets status
    const sheetsStatus = googleSheetsService.getStatus();

    // Update Google Sheet if configured
    let googleSheetsSuccess = false;
    let googleSheetsMessage = "Google Sheets not configured";

    if (sheetsStatus.isConfigured) {
      const result = await googleSheetsService.updateSheet(
        {},
        labeler
          ? `${DATASETS[datasetId].sheetTabName}_${labeler}`
          : DATASETS[datasetId].sheetTabName,
        datasetId
      );
      googleSheetsSuccess = result.success;
      googleSheetsMessage = result.message;
    } else {
      googleSheetsMessage = sheetsStatus.message;
    }

    return NextResponse.json({
      success: googleSheetsSuccess,
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
