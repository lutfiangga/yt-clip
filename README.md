# 🎬 Clipper AI

AI-powered video clipper that automatically detects highlights and creates vertical clips for social media.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- 🎯 **Smart Highlight Detection** - Uses Whisper AI to transcribe and identify interesting segments
- 👤 **Face Tracking Crop** - Automatically centers crop on faces using OpenCV
- 📐 **Multiple Aspect Ratios** - Export clips in 9:16 (TikTok/Reels), 1:1, 16:9, or 4:5
- 📁 **File Deduplication** - Reuses existing uploads to save storage
- 📜 **Job History** - SQLite-based persistence for tracking all processing jobs
- 🎥 **In-Browser Preview** - Preview clips before exporting with ratio overlay

## Tech Stack

| Component        | Technology                  |
| ---------------- | --------------------------- |
| Frontend         | React + Vite + Tailwind CSS |
| Backend          | Node.js + Express           |
| AI Engine        | Python (Whisper, OpenCV)    |
| Database         | SQLite (better-sqlite3)     |
| Video Processing | FFmpeg                      |

## Prerequisites

- Node.js 18+
- Python 3.10+
- FFmpeg (installed and in PATH)

## Installation

### 1. Clone & Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..

# Create Python virtual environment
python -m venv .venv

# Activate venv (Windows)
.venv\Scripts\activate

# Install Python packages
pip install -r python/requirements.txt
```

### 2. Run Development Server

```bash
npm run dev
```

This starts both client (http://localhost:5173) and server (http://localhost:3000).

## Project Structure

```
clipper/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── services/       # API client
│   │   └── App.jsx
│   └── package.json
├── server/                 # Express backend
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Helpers
│   ├── uploads/            # Uploaded videos
│   └── outputs/            # Exported clips
├── python/                 # AI scripts
│   ├── detector.py         # Highlight detection
│   └── render_clip.py      # Smart cropping
└── package.json            # Root scripts
```

## API Endpoints

| Endpoint                       | Method | Description            |
| ------------------------------ | ------ | ---------------------- |
| `/api/jobs/upload`             | POST   | Upload video file      |
| `/api/jobs/url`                | POST   | Process YouTube URL    |
| `/api/jobs/:id`                | GET    | Get job status         |
| `/api/jobs`                    | GET    | List all jobs          |
| `/api/jobs/export`             | POST   | Export a clip          |
| `/api/jobs/download/:filename` | GET    | Download exported clip |

## How It Works

1. **Upload** - User uploads a video file (or pastes YouTube URL)
2. **Transcribe** - Whisper AI transcribes the audio
3. **Segment** - AI groups transcribed text into coherent clips (15s - 2min)
4. **Preview** - User previews detected clips with ratio overlay
5. **Export** - FFmpeg creates cropped vertical clips with face tracking
6. **Download** - User downloads via browser's native video controls

## License

MIT
