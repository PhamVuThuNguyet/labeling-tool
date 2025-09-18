# Spine Image Classification Tool

A web-based image classification tool for labeling spine images as "Burst Fracture" or "No Burst Fracture".

## Features

- Image viewer with navigation controls
- Classification buttons for "Burst Fracture" and "No Burst Fracture"
- Auto-save to Google Sheets
- Clear button to reset the current image classification
- Reset button to clear all labels

## Screenshots

![Screenshot](screenshot.png)

## Getting Started

See [SETUP.md](SETUP.md) for detailed setup instructions.

### Data Setup

The application expects a `data` folder in the project root.

### Google Sheets Integration

For detailed instructions on setting up Google Sheets integration, see [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md).

### Vercel Deployment

For instructions on deploying this application to Vercel, see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

### Quick Start

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

## Technology Stack

- Next.js
- TypeScript
- Tailwind CSS
- Google Sheets API

## License

MIT