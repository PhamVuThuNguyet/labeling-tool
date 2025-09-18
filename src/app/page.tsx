"use client";

import { useEffect, useState } from "react";
import ImageViewer from "@/components/ImageViewer";
import ClassificationButtons from "@/components/ClassificationButtons";
import GoogleSheetsStatus from "@/components/GoogleSheetsStatus";
import { getImagePaths, saveClassification, clearAllLabels } from "@/lib/api";

export default function Home() {
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classifications, setClassifications] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [sheetsStatus, setSheetsStatus] = useState({
    isConfigured: false,
    message: "Loading...",
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const paths = await getImagePaths();
        setImagePaths(paths);

        // Fetch existing classifications
        const response = await fetch("/api/classifications");
        const data = await response.json();
        setClassifications(data.classifications || {});

        // Get Google Sheets status
        if (data.googleSheets) {
          setSheetsStatus(data.googleSheets);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching image data:", error);
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const handleNext = () => {
    if (currentIndex < imagePaths.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSaveStatus(null);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSaveStatus(null);
    }
  };

  const handleClassify = async (classification: string) => {
    if (currentImage) {
      const updatedClassifications = {
        ...classifications,
        [currentImage]: classification,
      };

      setClassifications(updatedClassifications);
      setSaveStatus("Saving...");

      try {
        const result = await saveClassification(currentImage, classification);

        if (result.success) {
          setSaveStatus("Saved locally ✓");

          if (result.googleSheets) {
            setSheetsStatus(result.googleSheets);
            if (result.googleSheets.isConfigured) {
              setSaveStatus(
                result.googleSheets.updateSuccess
                  ? "Saved locally and to Google Sheets ✓"
                  : "Saved locally. Google Sheets update failed!"
              );
            }
          }
        } else {
          setSaveStatus("Save failed!");
        }
      } catch (error) {
        console.error("Error saving classification:", error);
        setSaveStatus("Save failed!");
      }
    }
  };

  const handleClear = async () => {
    if (currentImage && classifications[currentImage]) {
      const updatedClassifications = { ...classifications };
      delete updatedClassifications[currentImage];

      setClassifications(updatedClassifications);
      setSaveStatus("Clearing...");

      try {
        const result = await saveClassification(currentImage, "");

        if (result.success) {
          setSaveStatus("Cleared locally ✓");

          if (result.googleSheets) {
            setSheetsStatus(result.googleSheets);
            if (result.googleSheets.isConfigured) {
              setSaveStatus(
                result.googleSheets.updateSuccess
                  ? "Cleared locally and from Google Sheets ✓"
                  : "Cleared locally. Google Sheets update failed!"
              );
            }
          }
        } else {
          setSaveStatus("Clear failed!");
        }
      } catch (error) {
        console.error("Error clearing classification:", error);
        setSaveStatus("Clear failed!");
      }
    }
  };

  const handleResetAll = async () => {
    if (confirm("Are you sure you want to reset all classifications?")) {
      setClassifications({});
      setSaveStatus("Resetting all...");

      try {
        const result = await clearAllLabels();

        if (result.success) {
          setSaveStatus("Reset all locally ✓");

          if (result.googleSheets) {
            setSheetsStatus(result.googleSheets);
            if (result.googleSheets.isConfigured) {
              setSaveStatus(
                result.googleSheets.updateSuccess
                  ? "Reset all locally and in Google Sheets ✓"
                  : "Reset all locally. Google Sheets update failed!"
              );
            }
          }
        } else {
          setSaveStatus("Reset failed!");
        }
      } catch (error) {
        console.error("Error resetting all classifications:", error);
        setSaveStatus("Reset failed!");
      }
    }
  };

  const currentImage = imagePaths[currentIndex];
  const currentClassification = currentImage
    ? classifications[currentImage]
    : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading images...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Spine Image Classification
            </h1>

            {imagePaths.length > 0 ? (
              <>
                <div className="mb-6">
                  <ImageViewer
                    imagePath={currentImage}
                    index={currentIndex + 1}
                    total={imagePaths.length}
                  />
                </div>

                <div className="flex flex-col space-y-6">
                  <ClassificationButtons
                    selectedValue={currentClassification}
                    onClassify={handleClassify}
                    onClear={handleClear}
                  />

                  {saveStatus && (
                    <div className="text-center text-sm">
                      <span
                        className={`px-3 py-1 rounded-full ${
                          saveStatus.includes("failed")
                            ? "bg-red-100 text-red-800"
                            : saveStatus.includes("...")
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {saveStatus}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Previous
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={currentIndex === imagePaths.length - 1}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Next
                      </button>
                    </div>

                    <button
                      onClick={handleResetAll}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Google Sheets Status */}
                  <GoogleSheetsStatus
                    isConfigured={sheetsStatus.isConfigured}
                    message={sheetsStatus.message}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No images found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
