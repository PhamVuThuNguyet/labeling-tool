"use client";

import { useEffect, useState } from "react";
import ImageViewer from "@/components/ImageViewer";
import ClassificationButtons from "@/components/ClassificationButtons";
import GoogleSheetsStatus from "@/components/GoogleSheetsStatus";
import NavigationSidebar from "@/components/NavigationSidebar";
import { getImagePaths, saveClassification, clearAllLabels } from "@/lib/api";
import { DATASETS, DatasetId, isKnownDataset } from "@/lib/datasetConfig";
import Link from "next/link";
// import telemetry from "@/lib/telemetry";

export default function DatasetPage() {
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classifications, setClassifications] = useState<
    Record<string, string>
  >({});
  const [labeler, setLabeler] = useState<string>("");
  const [labelerInput, setLabelerInput] = useState("");
  const [labelerReady, setLabelerReady] = useState(false);
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

  // Initialize labeler from URL on first load (URL-only)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const fromUrl = (url.searchParams.get("labeler") || "")
        .trim()
        .toLowerCase();
      const value = fromUrl;
      if (value) {
        setLabeler(value);
        setLabelerInput(value);
      }
    } finally {
      setLabelerReady(true);
    }
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      const loadStart = performance.now?.() || Date.now();
      try {
        setLoading(true);
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
        const loadEnd = performance.now?.() || Date.now();
        // telemetry.record({
        //   type: "page_load",
        //   datasetId,
        //   labeler,
        //   imageCount: (paths || []).length,
        //   serverDurationMs: loadEnd - loadStart,
        //   success: true,
        // });
      } catch (error) {
        console.error("Error fetching image data:", error);
        setLoading(false);
        const loadEnd = performance.now?.() || Date.now();
        // telemetry.record({
        //   type: "page_load",
        //   datasetId,
        //   labeler,
        //   serverDurationMs: loadEnd - loadStart,
        //   success: false,
        //   error: String(error),
        // });
      }
    };

    if (labeler) fetchImages();
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
      const clickTs = performance.now?.() || Date.now();
      const updatedClassifications = {
        ...classifications,
        [currentImage]: classification,
      };

      setClassifications(updatedClassifications);
      setSaveStatus("Saving...");

      try {
        const saveStart = performance.now?.() || Date.now();
        const result = await saveClassification(
          currentImage,
          classification,
          datasetId,
          labeler
        );

        if (result.success) {
          setSaveStatus("Saving to Google Sheets...");
          const ackTs = performance.now?.() || Date.now();

          //   telemetry.record({
          //     type: "classify",
          //     datasetId,
          //     labeler,
          //     imagePath: currentImage,
          //     classification,
          //     responseTimeMs: ackTs - clickTs,
          //     serverDurationMs: ackTs - saveStart,
          //     success: true,
          //   });

          // Wait for telemetry to be sent to Google Sheets
          //   setSaveStatus("Saving telemetry to Google Sheets...");
          //   try {
          //     await telemetry.flush();
          //   } catch (error) {
          //     console.error("Telemetry failed:", error);
          //   }

          // Handle Google Sheets status
          if (result.googleSheets) {
            setSheetsStatus(result.googleSheets);
            if (result.googleSheets.isConfigured) {
              setSaveStatus(
                result.googleSheets.updateSuccess
                  ? "Saved to Google Sheets ✓"
                  : "Google Sheets update failed!"
              );
            } else {
              setSaveStatus("Google Sheets not configured");
            }
          } else {
            setSaveStatus("Save failed!");
          }

          if (result.googleSheets && result.googleSheets.updateSuccess) {
            if (currentIndex < imagePaths.length - 1) {
              setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                setSaveStatus(null);
              }, 500);
            }
          }
        } else {
          setSaveStatus("Save failed!");
          const failTs = performance.now?.() || Date.now();
          //   telemetry.record({
          //     type: "classify",
          //     datasetId,
          //     labeler,
          //     imagePath: currentImage,
          //     classification,
          //     responseTimeMs: failTs - clickTs,
          //     success: false,
          //   });
        }
      } catch (error) {
        console.error("Error saving classification:", error);
        setSaveStatus("Save failed!");
        const errTs = performance.now?.() || Date.now();
        // telemetry.record({
        //   type: "classify",
        //   datasetId,
        //   labeler,
        //   imagePath: currentImage,
        //   classification,
        //   responseTimeMs: errTs - clickTs,
        //   success: false,
        //   error: String(error),
        // });
      }
    }
  };

  const handleClear = async () => {
    if (currentImage && classifications[currentImage]) {
      const clickTs = performance.now?.() || Date.now();
      const updatedClassifications = { ...classifications };
      delete updatedClassifications[currentImage];

      setClassifications(updatedClassifications);
      setSaveStatus("Clearing...");

      try {
        const saveStart = performance.now?.() || Date.now();
        const result = await saveClassification(
          currentImage,
          "",
          datasetId,
          labeler
        );

        if (result.success) {
          setSaveStatus("Clearing from Google Sheets...");
          const ackTs = performance.now?.() || Date.now();
          //   telemetry.record({
          //     type: "clear",
          //     datasetId,
          //     labeler,
          //     imagePath: currentImage,
          //     responseTimeMs: ackTs - clickTs,
          //     serverDurationMs: ackTs - saveStart,
          //     success: true,
          //   });

          if (result.googleSheets) {
            setSheetsStatus(result.googleSheets);
            if (result.googleSheets.isConfigured) {
              setSaveStatus(
                result.googleSheets.updateSuccess
                  ? "Cleared from Google Sheets ✓"
                  : "Google Sheets update failed!"
              );
            } else {
              setSaveStatus("Google Sheets not configured");
            }
          } else {
            setSaveStatus("Clear failed!");
          }
        } else {
          setSaveStatus("Clear failed!");
          const failTs = performance.now?.() || Date.now();
          //   telemetry.record({
          //     type: "clear",
          //     datasetId,
          //     labeler,
          //     imagePath: currentImage,
          //     responseTimeMs: failTs - clickTs,
          //     success: false,
          //   });
        }
      } catch (error) {
        console.error("Error clearing classification:", error);
        setSaveStatus("Clear failed!");
        const errTs = performance.now?.() || Date.now();
        // telemetry.record({
        //   type: "clear",
        //   datasetId,
        //   labeler,
        //   imagePath: currentImage,
        //   success: false,
        //   error: String(error),
        //   responseTimeMs: errTs - clickTs,
        // });
      }
    }
  };

  const handleResetAll = async () => {
    if (confirm("Are you sure you want to reset all classifications?")) {
      const clickTs = performance.now?.() || Date.now();
      setClassifications({});
      setSaveStatus("Resetting all...");

      try {
        const resetStart = performance.now?.() || Date.now();
        const result = await clearAllLabels(datasetId, labeler);

        if (result.success) {
          setSaveStatus("Resetting all in Google Sheets...");
          const ackTs = performance.now?.() || Date.now();
          //   telemetry.record({
          //     type: "reset_all",
          //     datasetId,
          //     labeler,
          //     responseTimeMs: ackTs - clickTs,
          //     serverDurationMs: ackTs - resetStart,
          //     success: true,
          //   });

          if (result.googleSheets) {
            setSheetsStatus(result.googleSheets);
            if (result.googleSheets.isConfigured) {
              setSaveStatus(
                result.googleSheets.updateSuccess
                  ? "Reset all in Google Sheets ✓"
                  : "Google Sheets update failed!"
              );
            } else {
              setSaveStatus("Google Sheets not configured");
            }
          } else {
            setSaveStatus("Reset failed!");
          }

          setCurrentIndex(0);
        } else {
          setSaveStatus("Reset failed!");
          const failTs = performance.now?.() || Date.now();
          //   telemetry.record({
          //     type: "reset_all",
          //     datasetId,
          //     labeler,
          //     success: false,
          //     responseTimeMs: failTs - clickTs,
          //   });
        }
      } catch (error) {
        console.error("Error resetting all classifications:", error);
        setSaveStatus("Reset failed!");
        const errTs = performance.now?.() || Date.now();
        // telemetry.record({
        //   type: "reset_all",
        //   datasetId,
        //   labeler,
        //   success: false,
        //   error: String(error),
        //   responseTimeMs: errTs - clickTs,
        // });
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

  // Periodic sampling for throughput and memory; basic error/misclick tracking
  useEffect(() => {
    const startedAt = Date.now();
    const performanceWithMemory = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    const intervalId = window.setInterval(() => {
      try {
        const now = Date.now();
        const minutes = (now - startedAt) / 60000;
        const currentLabeled = Object.keys(classifications || {}).length;
        const throughputPerMin = minutes > 0 ? currentLabeled / minutes : 0;
        const memoryMB = performanceWithMemory.memory
          ? Math.round(
              (performanceWithMemory.memory.usedJSHeapSize / 1048576) * 100
            ) / 100
          : undefined;
        // telemetry.record({
        //   type: "sample",
        //   datasetId,
        //   labeler,
        //   minutes,
        //   labeled: currentLabeled,
        //   throughputPerMin,
        //   memoryMB,
        // });
      } catch {}
    }, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [datasetId, labeler, classifications]);

  // Early UI states for labeler readiness
  if (!labelerReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing...</p>
        </div>
      </div>
    );
  }

  if (!labeler) {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const value = labelerInput.trim().toLowerCase();
      if (!value) return;
      setLabeler(value);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("labeler", value);
        window.history.replaceState(null, "", url.toString());
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Enter your labeler name
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            We use this to attribute your annotations.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={labelerInput}
              onChange={(e) => setLabelerInput(e.target.value)}
              placeholder="e.g., alice"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

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
