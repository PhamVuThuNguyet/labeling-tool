/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

interface NavigationSidebarProps {
  imagePaths: string[];
  currentIndex: number;
  classifications: Record<string, string>;
  onImageSelect: (index: number) => void;
  onJumpToNextUnclassified: () => void;
  onJumpToPreviousUnclassified: () => void;
}

const NavigationSidebar = ({
  imagePaths,
  currentIndex,
  classifications,
  onImageSelect,
  onJumpToNextUnclassified,
  onJumpToPreviousUnclassified,
}: NavigationSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getImageStatus = (imagePath: string) => {
    const classification = classifications[imagePath];
    if (!classification) return "unclassified";
    return classification === "1" ? "burst-fracture" : "no-burst-fracture";
  };

  const getUnclassifiedIndices = () => {
    return imagePaths
      .map((path, index) => ({ path, index }))
      .filter(({ path }) => !classifications[path])
      .map(({ index }) => index);
  };

  const unclassifiedIndices = getUnclassifiedIndices();
  const hasNextUnclassified = unclassifiedIndices.some(
    (index) => index > currentIndex
  );
  const hasPreviousUnclassified = unclassifiedIndices.some(
    (index) => index < currentIndex
  );

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-4 h-screen">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Expand sidebar"
        >
          <svg
            className="w-6 h-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-100 border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Navigation</h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Collapse sidebar"
          >
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* Progress Stats */}
        <div className="mt-3 text-sm text-gray-600">
          <div>Total: {imagePaths.length}</div>
          <div>Classified: {Object.keys(classifications).length}</div>
          <div>
            Remaining: {imagePaths.length - Object.keys(classifications).length}
          </div>
        </div>
      </div>

      {/* Jump Buttons */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={onJumpToPreviousUnclassified}
            disabled={!hasPreviousUnclassified}
            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            title="Jump to previous unclassified image"
          >
            ← Prev Unclassified
          </button>
          <button
            onClick={onJumpToNextUnclassified}
            disabled={!hasNextUnclassified}
            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            title="Jump to next unclassified image"
          >
            Next Unclassified →
          </button>
        </div>
      </div>

      {/* Thumbnail List */}
      <div className="flex-1 overflow-y-auto p-2 max-h-screen">
        <div className="space-y-2">
          {imagePaths.map((imagePath, index) => {
            const status = getImageStatus(imagePath);
            const isCurrent = index === currentIndex;
            const fileName = imagePath.split("/").pop() || "";

            return (
              <div
                key={imagePath}
                onClick={() => onImageSelect(index)}
                className={`
                  relative cursor-pointer rounded-lg border-2 transition-all hover:shadow-md
                  ${
                    isCurrent
                      ? "border-blue-500 shadow-lg"
                      : "border-gray-200 hover:border-gray-300"
                  }
                  ${
                    status === "burst-fracture"
                      ? "bg-red-50"
                      : status === "no-burst-fracture"
                      ? "bg-green-50"
                      : "bg-white"
                  }
                `}
                title={`${fileName} - ${
                  status === "unclassified"
                    ? "Unclassified"
                    : status === "burst-fracture"
                    ? "Burst Fracture (1)"
                    : "No Burst Fracture (0)"
                }`}
              >
                {/* Thumbnail */}
                <div className="aspect-square overflow-hidden rounded-md">
                  <img
                    src={`/api/image?path=${encodeURIComponent(imagePath)}`}
                    alt={`Slice ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Status Indicator */}
                <div className="absolute top-1 right-1">
                  {status === "burst-fracture" && (
                    <div
                      className="w-3 h-3 bg-red-500 rounded-full border border-white"
                      title="Burst Fracture (1)"
                    />
                  )}
                  {status === "no-burst-fracture" && (
                    <div
                      className="w-3 h-3 bg-green-500 rounded-full border border-white"
                      title="No Burst Fracture (0)"
                    />
                  )}
                  {status === "unclassified" && (
                    <div
                      className="w-3 h-3 bg-gray-300 rounded-full border border-white"
                      title="Unclassified"
                    />
                  )}
                </div>

                {/* Image Number */}
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                  {index + 1}
                </div>

                {/* Current Indicator */}
                {isCurrent && (
                  <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NavigationSidebar;
