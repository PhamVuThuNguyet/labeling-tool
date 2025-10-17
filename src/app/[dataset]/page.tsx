"use client";

import { useEffect, useState } from "react";
import ImageViewer from "@/components/ImageViewer";
import ClassificationButtons from "@/components/ClassificationButtons";
import GoogleSheetsStatus from "@/components/GoogleSheetsStatus";
import NavigationSidebar from "@/components/NavigationSidebar";
import { getImagePaths, saveClassification, clearAllLabels } from "@/lib/api";
import { DATASETS, DatasetId, isKnownDataset } from "@/lib/datasetConfig";
import Link from "next/link";

export default function DatasetPage() {
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classifications, setClassifications] = useState<
    Record<string, string>
  >({});
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const [labeler] = useState<string>(
    (searchParams?.get("labeler") || "").toLowerCase()
  );
  const [loading, setLoading] = useState(true);
  const [sheetsStatus, setSheetsStatus] = useState({
    isConfigured: false,
    message: "Loading...",
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const datasetFromPath = (() => {
    if (typeof window === "undefined") return undefined;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const candidate = parts[0];
    return candidate && isKnownDataset(candidate)
      ? (candidate as DatasetId)
      : (Object.keys(DATASETS)[0] as DatasetId);
  })();

  const datasetId: DatasetId =
    datasetFromPath || (Object.keys(DATASETS)[0] as DatasetId);
  const datasetConfig = DATASETS[datasetId];

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const paths = await getImagePaths(datasetId);
        setImagePaths(paths);

        const params = new URLSearchParams();
        params.set("dataset", datasetId);
        params.set("labeler", labeler);
        const response = await fetch(
          `/api/classifications?${params.toString()}`
        );
        const data = await response.json();
        setClassifications(data.classifications || {});

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
  }, [datasetId, labeler]);

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

  const handleImageSelect = (index: number) => {
    setCurrentIndex(index);
    setSaveStatus(null);
  };

  const handleJumpToNextUnclassified = () => {
    const unclassifiedIndices = imagePaths
      .map((path, index) => ({ path, index }))
      .filter(({ path }) => !classifications[path])
      .map(({ index }) => index);

    const nextUnclassified = unclassifiedIndices.find(
      (index) => index > currentIndex
    );
    if (nextUnclassified !== undefined) {
      setCurrentIndex(nextUnclassified);
      setSaveStatus(null);
    }
  };

  const handleJumpToPreviousUnclassified = () => {
    const unclassifiedIndices = imagePaths
      .map((path, index) => ({ path, index }))
      .filter(({ path }) => !classifications[path])
      .map(({ index }) => index);

    const previousUnclassified = unclassifiedIndices
      .slice()
      .reverse()
      .find((index) => index < currentIndex);

    if (previousUnclassified !== undefined) {
      setCurrentIndex(previousUnclassified);
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
        const result = await saveClassification(
          currentImage,
          classification,
          datasetId,
          labeler
        );

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

          if (currentIndex < imagePaths.length - 1) {
            setTimeout(() => {
              setCurrentIndex(currentIndex + 1);
              setSaveStatus(null);
            }, 500);
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
        const result = await saveClassification(
          currentImage,
          "",
          datasetId,
          labeler
        );

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
        const result = await clearAllLabels(datasetId, labeler);

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

          setCurrentIndex(0);
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

  const getStudyId = (imagePath: string) => {
    if (!imagePath) return "";
    const pathParts = imagePath.split("/");
    return pathParts[pathParts.length - 2] || "";
  };

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
    <main className="min-h-screen bg-gray-50 flex">
      {imagePaths.length > 0 && (
        <NavigationSidebar
          imagePaths={imagePaths}
          currentIndex={currentIndex}
          classifications={classifications}
          onImageSelect={handleImageSelect}
          onJumpToNextUnclassified={handleJumpToNextUnclassified}
          onJumpToPreviousUnclassified={handleJumpToPreviousUnclassified}
          datasetId={datasetId}
        />
      )}

      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                  {datasetConfig.title || "Image Classification"}
                </h1>
                <h3 className="text-xl text-gray-800">
                  Annotated by: {labeler}
                </h3>
              </div>

              {currentImage && (
                <div className="mb-4 text-center">
                  <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-medium">
                    Study ID: {getStudyId(currentImage)}
                  </div>
                </div>
              )}

              {imagePaths.length > 0 ? (
                <>
                  <div className="mb-6">
                    <ImageViewer
                      imagePath={currentImage}
                      index={currentIndex + 1}
                      total={imagePaths.length}
                      dataset={datasetId}
                    />
                  </div>

                  <div className="flex flex-col space-y-6">
                    <ClassificationButtons
                      selectedValue={currentClassification}
                      labels={datasetConfig.labels}
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

                      <div className="flex space-x-2">
                        <Link
                          href="/"
                          className="px-3 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 text-white"
                        >
                          Home
                        </Link>

                        <button
                          onClick={handleResetAll}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          Reset All
                        </button>
                      </div>
                    </div>

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
      </div>
    </main>
  );
}
