const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jobQueue = require('../services/jobQueue');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Helper to calculate file hash for deduplication
function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

// In-memory cache for file hashes (originalName -> storedFilename)
// In production, this should be in the database
const fileCache = new Map();

// Configure Multer with custom deduplication
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        // Check if we already have a file with the same original name
        const existingFile = fileCache.get(file.originalname);
        if (existingFile && fs.existsSync(path.join(UPLOAD_DIR, existingFile))) {
            // File exists, we'll mark it for reuse
            req.reuseFile = existingFile;
            // Still need to give multer a temp name (it will be deleted)
            cb(null, 'temp-' + Date.now());
        } else {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = uniqueSuffix + path.extname(file.originalname);
            cb(null, filename);
        }
    }
});

const upload = multer({ storage: storage });

// POST /api/jobs/upload - Upload video file with deduplication
router.post('/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    let finalFilename = req.file.filename;
    let finalPath = req.file.path;

    // Handle deduplication
    if (req.reuseFile) {
        // Delete the temp file multer created
        try {
            fs.unlinkSync(req.file.path);
        } catch { }

        finalFilename = req.reuseFile;
        finalPath = path.join(UPLOAD_DIR, req.reuseFile);
        console.log(`Reusing existing file: ${finalFilename} for ${req.file.originalname}`);
    } else {
        // Cache the new file
        fileCache.set(req.file.originalname, req.file.filename);
        console.log(`New file cached: ${req.file.originalname} -> ${req.file.filename}`);
    }

    const job = jobQueue.addJob('process_upload', {
        filePath: finalPath,
        originalName: req.file.originalname,
        filename: finalFilename
    });

    res.json({ success: true, jobId: job.id, message: 'Upload received, processing started' });
});

// POST /api/jobs/url - Process YouTube URL
router.post('/url', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    const job = jobQueue.addJob('download_video', { url });

    res.json({ success: true, jobId: job.id, message: 'URL job queued' });
});

// GET /api/jobs - List all jobs
router.get('/', (req, res) => {
    const jobs = jobQueue.getAllJobs();
    res.json(jobs);
});

// GET /api/jobs/:id - Check status
router.get('/:id', (req, res) => {
    const job = jobQueue.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
});

// POST /api/export - Export a clip
router.post('/export', async (req, res) => {
    const { jobId, start, end, ratio } = req.body;

    if (!jobId || start === undefined || end === undefined) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    const job = jobQueue.getJob(jobId);
    if (!job || !job.data?.filePath) {
        return res.status(404).json({ error: 'Job or video file not found' });
    }

    const exportJob = jobQueue.addJob('render_clip', {
        originalJobId: jobId,
        sourcePath: job.data.filePath,
        start,
        end,
        ratio: ratio || 9 / 16
    });

    res.json({ success: true, exportJobId: exportJob.id });
});

// GET /api/download/:filename
router.get('/download/:filename', (req, res) => {
    // Use outputs folder inside server
    const filePath = path.join(__dirname, '../outputs', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

module.exports = router;
