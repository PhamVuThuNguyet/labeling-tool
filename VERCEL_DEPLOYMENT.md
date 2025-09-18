# Deploying to Vercel

This guide will help you deploy your Spine Image Classification Tool to Vercel.

## Prerequisites

- A GitHub, GitLab, or Bitbucket account
- The Vercel CLI (optional for advanced configuration)
- Your Google Sheets service account key

## Step 1: Prepare your repository

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Make sure your `.gitignore` file includes:
   ```
   .env
   .env.local
   service-account-key.json
   classifications.json
   /node_modules
   /.next
   ```

## Step 2: Set up your project on Vercel

1. Log in to [Vercel](https://vercel.com/)
2. Click "Add New" > "Project"
3. Import your Git repository
4. Configure your project:
   - Framework Preset: Next.js
   - Root Directory: labeling-tool (if your repository contains the labeling-tool directory)
   - Build Command: `npm run build`
   - Output Directory: .next

## Step 3: Configure Environment Variables

1. In the project settings, go to "Environment Variables"
2. Add the following variables:
   - `GOOGLE_SPREADSHEET_ID`: Your Google Spreadsheet ID

## Step 4: Upload Service Account Key (Two options)

### Option 1: Using Environment Variables (Recommended)
1. Open your service-account-key.json file
2. Copy the entire content
3. In Vercel project settings, create a new environment variable:
   - Name: `GOOGLE_SERVICE_ACCOUNT_KEY`
   - Value: Paste the entire JSON content

### Option 2: Using Vercel CLI for Secret Files
1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Add the service account key as a secret:
   ```
   vercel secret add google-service-account-key "$(cat service-account-key.json)"
   ```
4. Reference it in your vercel.json file

## Step 5: Deploy

1. Click "Deploy" in the Vercel dashboard
2. Wait for the deployment to complete
3. Your app will be live at a URL like: `https://your-project-name.vercel.app`

## Step 6: Verify Configuration

1. Open your deployed application
2. Check that the Google Sheets status shows "Connected" 
3. Verify that classifications are being saved both locally and to Google Sheets

## Troubleshooting

- **Google Sheets Connection Issues**: Check that your environment variables are set correctly and that the service account has access to your Google Sheet.
- **API Routes Not Working**: Make sure your API routes are compatible with Vercel's serverless functions.
- **Image Loading Issues**: Verify that the image paths in your API are correct for the deployed environment.

For more help, refer to [Vercel's documentation](https://vercel.com/docs) or [contact Vercel support](https://vercel.com/help).
