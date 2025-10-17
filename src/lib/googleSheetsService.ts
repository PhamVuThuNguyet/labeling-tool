/* eslint-disable @typescript-eslint/no-explicit-any */
import { google } from "googleapis";
import { DATASETS, DatasetId } from "@/lib/datasetConfig";
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

  private async getSheetTitles(): Promise<string[]> {
    const resp = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });
    const titles = (resp.data.sheets || [])
      .map((s: any) => s.properties?.title)
      .filter((t: string | undefined) => !!t);
    return titles as string[];
  }

  private async ensureSheetTabExists(
    sheetTabName: string,
    headers: string[]
  ): Promise<void> {
    const titles = await this.getSheetTitles();
    if (!titles.includes(sheetTabName)) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: sheetTabName },
              },
            },
          ],
        },
      });

      // write header row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetTabName}!A1`,
        valueInputOption: "RAW",
        resource: { values: [headers] },
      });
    }
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
    classifications: Record<string, string>,
    sheetTabName = "Classifications",
    datasetId?: DatasetId
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: this.configStatus,
      };
    }

    try {
      const headers =
        datasetId && DATASETS[datasetId]
          ? DATASETS[datasetId].headers
          : ["ImagePath", "Classification"];

      // ensure sheet exists
      await this.ensureSheetTabExists(sheetTabName, headers);

      // Convert classifications to array format using dataset-specific mapping
      const rows = Object.entries(classifications).map(
        ([imagePath, classification]) => {
          if (datasetId && DATASETS[datasetId]) {
            return DATASETS[datasetId].toRow(imagePath, classification);
          }
          // Fallback: generic two-column mapping
          return [imagePath, classification];
        }
      );

      // Add header row
      rows.unshift(headers);

      // Clear existing content
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetTabName}!A:C`,
      });

      // Update with new data
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetTabName}!A1`,
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
  async readSheet(
    sheetTabName = "Classifications",
    datasetId?: DatasetId
  ): Promise<{
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
      const headers =
        datasetId && DATASETS[datasetId]
          ? DATASETS[datasetId].headers
          : ["ImagePath", "Classification"];

      // ensure sheet exists
      await this.ensureSheetTabExists(sheetTabName, headers);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetTabName}!A:C`,
      });

      const rows = response.data.values || [];

      // Skip the header row
      const classifications: Record<string, string> = {};
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        if (datasetId && DATASETS[datasetId]) {
          const parsed = DATASETS[datasetId].fromRow(row as string[]);
          if (parsed) classifications[parsed.imagePath] = parsed.classification;
        } else if (row.length >= 2) {
          // Fallback: [imagePath, classification]
          const imagePath = row[0] as string;
          const classification = row[1] as string;
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
