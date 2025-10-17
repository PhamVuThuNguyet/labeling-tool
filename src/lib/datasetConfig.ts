export type DatasetId = "mls-data" | "spinal-data" | "triaging-data";

export interface DatasetConfig {
  // Subdirectory under the app's data directory where images reside
  dataDirName: string;
  // Google Sheets tab name to read/write
  sheetTabName: string;
  // Classification labels to render for this dataset
  labels: string[];
  // Optional page title override
  title?: string;
  // Header row for Google Sheet
  headers: string[];
  // Convert an imagePath and classification to a row for the sheet
  toRow: (imagePath: string, classification: string) => string[];
  // Parse a sheet row into an imagePath->classification mapping entry
  fromRow: (
    row: string[]
  ) => { imagePath: string; classification: string } | null;
}

export const DATASETS: Record<DatasetId, DatasetConfig> = {
  "triaging-data": {
    dataDirName: "mls-data",
    sheetTabName: "Triaging_Classifications",
    labels: ["High Risk", "Unclear", "Low Risk"],
    title: "TBI Risk Triaging",
    headers: ["Study_ID", "Slice_Number", "Triaging"],
    toRow: (imagePath, classification) => {
      // imagePath format: data/mls-data/<study_id>/<filename>.png
      const parts = imagePath.split("/");
      const study_id = parts[2] || imagePath;
      const slice_number = parts[3].replace(".png", "") || imagePath;
      return [study_id, slice_number, classification];
    },
    fromRow: (row) => {
      if (!row || row.length < 3) return null;
      const study_id = row[0];
      const slice_number = row[1];
      const classification = row[2];
      if (!study_id || !slice_number) return null;
      return {
        imagePath: `data/mls-data/${study_id}/${slice_number}.png`,
        classification,
      };
    },
  },
  "mls-data": {
    dataDirName: "mls-data",
    sheetTabName: "MLS_Classifications",
    labels: ["MLS", "No MLS"],
    title: "TBI Midline Shift Classification",
    headers: ["Study_ID", "Slice_Number", "MLS"],
    toRow: (imagePath, classification) => {
      // imagePath format: data/mls-data/<study_id>/<filename>.png
      const parts = imagePath.split("/");
      const study_id = parts[2] || imagePath;
      const slice_number = parts[3].replace(".png", "") || imagePath;
      return [study_id, slice_number, classification];
    },
    fromRow: (row) => {
      if (!row || row.length < 3) return null;
      const study_id = row[0];
      const slice_number = row[1];
      const classification = row[2];
      if (!study_id || !slice_number) return null;
      return {
        imagePath: `data/mls-data/${study_id}/${slice_number}.png`,
        classification,
      };
    },
  },
  "spinal-data": {
    dataDirName: "spinal-data",
    sheetTabName: "Spinal_Classifications",
    labels: ["Burst Fracture", "No Burst Fracture"],
    title: "Spinal Burst Fracture Classification",
    headers: ["StudyInstanceUID", "slice_number", "Burst_Fracture"],
    toRow: (imagePath, classification) => {
      // imagePath format: data/spinal-data/<StudyInstanceUID>/slice_<num>.png
      const parts = imagePath.split("/");
      const study_id = parts[2] || imagePath;
      const slice_number =
        parts[3].replace("slice_", "").replace(".png", "") || imagePath;
      return [study_id, slice_number, classification];
    },
    fromRow: (row) => {
      if (!row || row.length < 3) return null;
      const study_id = row[0];
      const slice_number = row[1];
      const classification = row[2];
      if (!study_id || !slice_number) return null;
      return {
        imagePath: `data/spinal-data/${study_id}/slice_${slice_number}.png`,
        classification,
      };
    },
  },
};

export function isKnownDataset(dataset: string): dataset is DatasetId {
  return Object.prototype.hasOwnProperty.call(DATASETS, dataset);
}
