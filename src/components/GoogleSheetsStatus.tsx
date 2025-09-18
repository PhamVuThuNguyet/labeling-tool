import { useState } from "react";

interface GoogleSheetsStatusProps {
  isConfigured: boolean;
  message: string;
}

const GoogleSheetsStatus: React.FC<GoogleSheetsStatusProps> = ({
  isConfigured,
  message,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="mt-4 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConfigured ? "bg-green-500" : "bg-yellow-500"
            }`}
          ></div>
          <span className="font-medium">
            Google Sheets: {isConfigured ? "Connected" : "Not Connected"}
          </span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {showDetails ? "Hide Details" : "Show Details"}
        </button>
      </div>

      {showDetails && (
        <div className="mt-2 text-sm text-gray-600 border-t pt-2">
          <p>{message}</p>
          {!isConfigured && (
            <div className="mt-2 text-xs bg-blue-50 p-2 rounded border border-blue-100">
              <p className="font-medium mb-1">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Create a Google Cloud project and enable Google Sheets API
                </li>
                <li>Create a service account and download the key as JSON</li>
                <li>
                  Rename the key file to &quot;service-account-key.json&quot;
                  and place it in the root project folder
                </li>
                <li>
                  Create a .env.local file with your GOOGLE_SPREADSHEET_ID
                </li>
                <li>
                  Share your Google Sheet with the service account email address
                </li>
                <li>Restart the application</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleSheetsStatus;
