import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DATASETS, isKnownDataset } from "@/lib/datasetConfig";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetParam = searchParams.get("dataset");
    const datasetId =
      datasetParam && isKnownDataset(datasetParam)
        ? datasetParam
        : (Object.keys(DATASETS)[0] as keyof typeof DATASETS);
    const datasetConfig = DATASETS[datasetId];

    // Use app data directory based on dataset config
    const dataDir = path.join(process.cwd(), "data", datasetConfig.dataDirName);
    if (!dataDir) {
      // If none exist, keep previous behavior but return empty
      console.error("No data directory resolved for dataset:", datasetId);
      return NextResponse.json({ images: [] });
    }

    const imagePaths: string[] = [];

    // Check if data directory exists
    if (!fs.existsSync(dataDir)) {
      console.error("Data directory not found at:", dataDir);
      return NextResponse.json({ images: [] });
    }

    const entries = fs.readdirSync(dataDir);
    const patientDirs = entries.filter((item) => {
      const itemPath = path.join(dataDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    const allowedExtensions = new Set([".png", ".jpg", ".jpeg"]);

    for (const patientDir of patientDirs) {
      const patientPath = path.join(dataDir, patientDir);
      const imageFiles = fs
        .readdirSync(patientPath)
        .filter((file) =>
          allowedExtensions.has(path.extname(file).toLowerCase())
        );

      for (const imageFile of imageFiles) {
        // Include dataset segment
        const relativePath = path.join(
          "data",
          datasetConfig.dataDirName,
          patientDir,
          imageFile
        );
        imagePaths.push(relativePath.replace(/\\/g, "/"));
      }
    }

    // Sort the paths to ensure consistent ordering
    imagePaths.sort();

    return NextResponse.json({ images: imagePaths });
  } catch (error) {
    console.error("Error reading image directories:", error);
    return NextResponse.json(
      { error: "Failed to read images" },
      { status: 500 }
    );
  }
}
