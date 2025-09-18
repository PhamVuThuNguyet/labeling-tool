// Utility functions for API communication

/**
 * Get all image paths from the API
 */
export async function getImagePaths(): Promise<string[]> {
  const response = await fetch("/api/images");
  const data = await response.json();
  return data.images || [];
}

/**
 * Save a classification for an image
 */
export async function saveClassification(
  imagePath: string,
  classification: string
): Promise<{
  success: boolean;
  googleSheets?: {
    isConfigured: boolean;
    updateSuccess: boolean;
    message: string;
  };
}> {
  const response = await fetch("/api/classifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imagePath, classification }),
  });

  return await response.json();
}

/**
 * Clear all labels
 */
export async function clearAllLabels(): Promise<{
  success: boolean;
  googleSheets?: {
    isConfigured: boolean;
    updateSuccess: boolean;
    message: string;
  };
}> {
  const response = await fetch("/api/classifications", {
    method: "DELETE",
  });

  return await response.json();
}

/**
 * Get Google Sheets status
 */
export async function getGoogleSheetsStatus(): Promise<{
  isConfigured: boolean;
  message: string;
}> {
  const response = await fetch("/api/classifications");
  const data = await response.json();
  return (
    data.googleSheets || { isConfigured: false, message: "Unknown status" }
  );
}
