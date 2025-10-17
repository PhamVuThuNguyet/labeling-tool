"use client";

import { DATASETS } from "@/lib/datasetConfig";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [labeler, setLabeler] = useState("");

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Choose a Dataset
            </h1>
            <p className="text-gray-600 mb-6 text-center">
              Select a dataset to start labeling.
            </p>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-80">
                <label
                  htmlFor="labeler"
                  className="block text-sm text-gray-600 mb-1"
                >
                  Labeler name (required)
                </label>
                <input
                  id="labeler"
                  value={labeler}
                  onChange={(e) =>
                    setLabeler(e.target.value.toLowerCase().trim())
                  }
                  placeholder="e.g. Alice"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                id="dataset-select"
                defaultValue=""
                onChange={(e) => {
                  const selected = e.target.value;
                  if (!selected || !labeler) return;
                  const qs = `?labeler=${encodeURIComponent(labeler)}`;
                  router.push(`/${selected}${qs}`);
                }}
                className="w-80 px-4 py-3 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!labeler}
              >
                <option value="" disabled>
                  {labeler
                    ? "Select dataset..."
                    : "Enter labeler name to continue"}
                </option>
                {Object.entries(DATASETS).map(([id, cfg]) => (
                  <option key={id} value={id}>
                    {cfg.title || id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
