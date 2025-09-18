# Google Sheets Integration Setup Guide

This guide will help you set up Google Sheets integration for the Spine Image Classification Tool.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Note down your Project ID

## Step 2: Enable the Google Sheets API

1. Go to [Google Cloud Console API Library](https://console.cloud.google.com/apis/library)
2. Search for "Google Sheets API"
3. Click on it and then click "Enable"

## Step 3: Create a Service Account

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "Service Account"
3. Enter a name for your service account (e.g., "spine-labeling-tool")
4. Optionally add a description
5. Click "Create and Continue"
6. For Role, select "Project" > "Editor" (you can set more restrictive permissions if needed)
7. Click "Continue" and then "Done"

## Step 4: Create and Download Service Account Key

1. In the Service accounts list, find the service account you just created
2. Click on the service account name to open its details
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Select "JSON" format
6. Click "Create"
7. The key file will be downloaded to your computer

## Step 5: Add the Service Account Key to Your Project

1. Rename the downloaded key file to `service-account-key.json`
2. Move the file to the root directory of your Next.js project (same level as package.json)

## Step 6: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a new spreadsheet
2. Rename the first sheet to "Classifications" (exact name is important)
3. Get the spreadsheet ID from the URL:
   - The URL looks like: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0`
   - The SPREADSHEET_ID is the long string between `/d/` and `/edit`

## Step 7: Share the Sheet with the Service Account

1. In your Google Sheet, click the "Share" button
2. Add the email address of your service account (found in the JSON key file under "client_email")
3. Give it Editor access
4. Make sure to uncheck "Notify people" 
5. Click "Share"

## Step 8: Configure Your Environment Variables

1. Create a file named `.env.local` in the root of your project
2. Add the following line:
   ```
   GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
   ```
   Replace `your_spreadsheet_id_here` with the actual spreadsheet ID from step 6

## Step 9: Restart the Application

1. If the application is running, stop it
2. Start it again with `npm run dev`
3. The Google Sheets status indicator should now show "Connected"

## Troubleshooting

If you're still seeing authentication errors:

1. Make sure the service account key file is correctly named and placed in the project root
2. Verify that the spreadsheet ID in `.env.local` is correct
3. Confirm that you've shared the sheet with the service account email
4. Check that the sheet has a tab exactly named "Classifications"
5. Ensure the Google Sheets API is enabled in your Google Cloud project

For API quota errors:

1. Make sure you have billing set up for your Google Cloud project if you're making many requests
2. The free tier should be sufficient for moderate use of the application
