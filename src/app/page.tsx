"use client";

import { DATASETS } from "@/lib/datasetConfig";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

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
            <div className="flex justify-center">
              <select
                id="dataset-select"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) router.push(`/${e.target.value}`);
                }}
                className="w-80 px-4 py-3 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>
                  Select dataset...
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
