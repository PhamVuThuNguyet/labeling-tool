import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get("path");

    if (!imagePath) {
      return NextResponse.json(
        { error: "Image path is required" },
        { status: 400 }
      );
    }

    // Use process.env.DATA_DIR if available (for Vercel), otherwise use the project root
    const dataDir = process.env.DATA_DIR
      ? path.join(process.cwd(), process.env.DATA_DIR)
      : path.join(process.cwd(), "data");

    // Extract the relative path within the data folder
    const pathParts = imagePath.split("/");
    if (pathParts.length < 3 || pathParts[0] !== "data") {
      return NextResponse.json(
        { error: "Invalid image path format" },
        { status: 400 }
      );
    }

    const studyInstanceUID = pathParts[1];
    const fileName = pathParts[2];

    // Reconstruct the full path
    const fullPath = path.join(dataDir, studyInstanceUID, fileName);

    // Ensure the path is within the data directory (security check)
    if (!fullPath.startsWith(dataDir)) {
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
