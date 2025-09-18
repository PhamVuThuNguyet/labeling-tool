import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Use process.env.DATA_DIR if available (for Vercel), otherwise use the project root
    const dataDir = process.env.DATA_DIR
      ? path.join(process.cwd(), process.env.DATA_DIR)
      : path.join(process.cwd(), "data");

    const imagePaths: string[] = [];

    // Check if data directory exists
    if (!fs.existsSync(dataDir)) {
      console.error("Data directory not found at:", dataDir);
      return NextResponse.json({ images: [] });
    }

    // Read the main directories (patient IDs)
    const patientDirs = fs.readdirSync(dataDir).filter((item) => {
      const itemPath = path.join(dataDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

    // For each patient directory, get the image files
    for (const patientDir of patientDirs) {
      const patientPath = path.join(dataDir, patientDir);
      const imageFiles = fs.readdirSync(patientPath).filter((file) => {
        return file.endsWith(".png");
      });

      // Add each image path to the array
      for (const imageFile of imageFiles) {
        const relativePath = path.join("data", patientDir, imageFile);
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
