/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from "googleapis";
import fs from "fs";
import path from "path";

// Path where the service account key will be stored
const SERVICE_ACCOUNT_KEY_PATH = path.join(
  process.cwd(),
  "service-account-key.json"
);

// Google Sheets integration
export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  private auth: any = null;
  private sheets: any = null;
  private spreadsheetId: string | null = null;
  private isConfigured: boolean = false;
  private configStatus: string = "Not initialized";

  private constructor() {
    this.initializeService();
  }

  private initializeService() {
    try {
      let credentials;

      // First check if service account key is provided as environment variable (for Vercel deployment)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
          credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        } catch (error) {
          this.configStatus =
            "Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY environment variable";
          console.error(this.configStatus, error);
          return;
        }
      }
      // If not, check for local file
      else if (fs.existsSync(SERVICE_ACCOUNT_KEY_PATH)) {
        try {
          credentials = JSON.parse(
            fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, "utf8")
          );
        } catch (error) {
          this.configStatus =
            "Failed to read or parse service account key file";
          console.error(this.configStatus, error);
          return;
        }
      }
      // No credentials available
      else {
        this.configStatus =
          "No service account credentials found. Please provide a service-account-key.json file or set GOOGLE_SERVICE_ACCOUNT_KEY environment variable";
        console.warn(this.configStatus);
        return;
      }

      if (!credentials.client_email || !credentials.private_key) {
        this.configStatus =
          "Invalid service account key - missing required fields";
        console.warn(this.configStatus);
        return;
      }

      // Create a new JWT client using the service account key
      try {
        this.auth = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        // Initialize the Sheets API
        this.sheets = google.sheets({ version: "v4", auth: this.auth });
      } catch (authError) {
        this.configStatus = `Authentication error: ${authError}`;
        console.error(this.configStatus);
        return;
      }

      // Get spreadsheet ID from environment variable
      this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || null;

      if (!this.spreadsheetId) {
        this.configStatus =
          "Google Spreadsheet ID not found. Please set GOOGLE_SPREADSHEET_ID in .env.local file.";
        console.warn(this.configStatus);
        return;
      }

      this.isConfigured = true;
      this.configStatus = "Successfully configured";
    } catch (error) {
      this.configStatus = `Failed to initialize Google Sheets service: ${error}`;
      console.error(this.configStatus);
    }
  }

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  /**
   * Check if Google Sheets integration is properly configured
   */
  public getStatus(): { isConfigured: boolean; message: string } {
    return {
      isConfigured: this.isConfigured,
      message: this.configStatus,
    };
  }

  /**
   * Updates the Google Sheet with the classification data
   */
  async updateSheet(
    classifications: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: this.configStatus,
      };
    }

    try {
      // Convert classifications to array format for Google Sheets with columns: StudyInstanceUID, slice_number, Burst_Fracture
      const rows = Object.entries(classifications).map(
        ([imagePath, classification]) => {
          // Extract StudyInstanceUID and slice_number from the image path
          const pathParts = imagePath.split("/");
          const studyInstanceUID = pathParts[1] || ""; // Second part of path is StudyInstanceUID
          const sliceFilename = pathParts[2] || "";
          const sliceNumber = sliceFilename
            .replace("slice_", "")
            .replace(".png", "");

          return [studyInstanceUID, sliceNumber, classification];
        }
      );

      // Add header row
      rows.unshift(["StudyInstanceUID", "slice_number", "Burst_Fracture"]);

      // Clear existing content
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: "Classifications!A:C",
      });

      // Update with new data
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: "Classifications!A1",
        valueInputOption: "RAW",
        resource: {
          values: rows,
        },
      });

      return {
        success: true,
        message: "Successfully updated Google Sheet",
      };
    } catch (error) {
      const errorMsg = `Error updating Google Sheet: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    }
  }

  /**
   * Reads the classifications from the Google Sheet
   */
  async readSheet(): Promise<{
    success: boolean;
    data: Record<string, string>;
    message: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        data: {},
        message: this.configStatus,
      };
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Classifications!A:C",
      });

      const rows = response.data.values || [];

      // Skip the header row
      const classifications: Record<string, string> = {};
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 3) {
          // Reconstruct the image path from StudyInstanceUID and slice_number
          const studyInstanceUID = row[0];
          const sliceNumber = row[1];
          const classification = row[2];

          // Format: data/1.2.826.0.1.3680043.12998/slice_194.png
          const imagePath = `data/${studyInstanceUID}/slice_${sliceNumber}.png`;
          classifications[imagePath] = classification;
        }
      }

      return {
        success: true,
        data: classifications,
        message: "Successfully read from Google Sheet",
      };
    } catch (error) {
      const errorMsg = `Error reading from Google Sheet: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        data: {},
        message: errorMsg,
      };
    }
  }
}

export default GoogleSheetsService.getInstance();
