// Utility functions for API communication

/**
 * Get all image paths from the API
 */
export async function getImagePaths(dataset?: string): Promise<string[]> {
  const url = dataset
    ? `/api/images?dataset=${encodeURIComponent(dataset)}`
    : "/api/images";
  const response = await fetch(url);
  const data = await response.json();
  return data.images || [];
}

/**
 * Save a classification for an image
 */
export async function saveClassification(
  imagePath: string,
  classification: string,
  dataset?: string
): Promise<{
  success: boolean;
  googleSheets?: {
    isConfigured: boolean;
    updateSuccess: boolean;
    message: string;
  };
}> {
  const url = dataset
    ? `/api/classifications?dataset=${encodeURIComponent(dataset)}`
    : "/api/classifications";
  const response = await fetch(url, {
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
export async function clearAllLabels(dataset?: string): Promise<{
  success: boolean;
  googleSheets?: {
    isConfigured: boolean;
    updateSuccess: boolean;
    message: string;
  };
}> {
  const url = dataset
    ? `/api/classifications?dataset=${encodeURIComponent(dataset)}`
    : "/api/classifications";
  const response = await fetch(url, {
    method: "DELETE",
  });

  return await response.json();
}

/**
 * Get Google Sheets status
 */
export async function getGoogleSheetsStatus(dataset?: string): Promise<{
  isConfigured: boolean;
  message: string;
}> {
  const url = dataset
    ? `/api/classifications?dataset=${encodeURIComponent(dataset)}`
    : "/api/classifications";
  const response = await fetch(url);
  const data = await response.json();
  return (
    data.googleSheets || { isConfigured: false, message: "Unknown status" }
  );
}
