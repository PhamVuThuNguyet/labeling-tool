import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DATASETS, isKnownDataset } from "@/lib/datasetConfig";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get("path");
    const datasetParam = searchParams.get("dataset");
    const datasetId =
      datasetParam && isKnownDataset(datasetParam)
        ? datasetParam
        : (Object.keys(DATASETS)[0] as keyof typeof DATASETS);
    const datasetConfig = DATASETS[datasetId];

    if (!imagePath) {
      return NextResponse.json(
        { error: "Image path is required" },
        { status: 400 }
      );
    }

    // Use only app data directory per dataset config
    const baseDir = path.join(process.cwd(), "data", datasetConfig.dataDirName);

    // Support nested format only:
    // - "data/<datasetDir>/<study>/<file.png>"
    const pathParts = imagePath.split("/");
    let fullPath: string;
    if (
      pathParts[0] === "data" &&
      pathParts[1] === datasetConfig.dataDirName &&
      pathParts.length >= 4
    ) {
      const studyInstanceUID = pathParts[2];
      const fileName = pathParts.slice(3).join("/");
      fullPath = path.join(baseDir, studyInstanceUID, fileName);
    } else {
      return NextResponse.json(
        { error: "Invalid image path format" },
        { status: 400 }
      );
    }

    // Ensure the path is within the data directory (security check)
    if (!fullPath.startsWith(baseDir)) {
      return NextResponse.json(
        { error: "Invalid image path" },
        { status: 403 }
      );
    }

    if (!fs.existsSync(fullPath)) {
      console.error("Image not found:", fullPath);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const imageBuffer = fs.readFileSync(fullPath);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 }
    );
  }
}
