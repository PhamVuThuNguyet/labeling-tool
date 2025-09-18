/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

interface ImageViewerProps {
  imagePath: string;
  index: number;
  total: number;
}

const ImageViewer = ({ imagePath, index, total }: ImageViewerProps) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative overflow-hidden rounded-lg shadow-md ${
          isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
        }`}
      >
        <div
          className={`transition-transform duration-200 ${
            isZoomed ? "scale-150" : "scale-100"
          }`}
          onClick={toggleZoom}
        >
          <img
            src={`/api/image?path=${encodeURIComponent(imagePath)}`}
            alt="Spine scan"
            className="max-w-full h-auto object-contain"
            style={{ maxHeight: "60vh" }}
          />
        </div>
      </div>
      <div className="mt-2 text-center text-gray-500">
        Image {index} of {total} - {imagePath.split("/").pop()}
      </div>
    </div>
  );
};

export default ImageViewer;
