const path = require('path');
const fs = require('fs');
const { runPython } = require('../utils/pythonRunner');
const { spawn } = require('child_process');
const axios = require('axios');
const ffmpegPath = require('ffmpeg-static');

async function downloadVideo(url, outputDir) {
    return new Promise((resolve, reject) => {
        const filenameTemplate = path.join(outputDir, '%(title)s.%(ext)s');

        // Revised arguments for better YouTube compatibility
        const args = [
            '-m', 'yt_dlp',
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', filenameTemplate,
            '--print', 'filename',
            '--no-simulate',
            '--no-mtime', // Don't use video modification time
            // Use Android client which is currently more stable
            '--extractor-args', 'youtube:player_client=android',
            // Explicitly set ffmpeg location from static binary
            '--ffmpeg-location', ffmpegPath,
            // Remove hardcoded user-agent to let yt-dlp handle it or use a default
        ];

        args.push(url);

        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        console.log(`Executing download: ${pythonCmd} ${args.join(' ')}`);

        const proc = spawn(pythonCmd, args);
        let output = '';
        let error = '';

        proc.stdout.on('data', d => output += d.toString());
        proc.stderr.on('data', d => error += d.toString());

        proc.on('close', code => {
            if (code !== 0) {
                // Check for common errors
                if (error.includes('Sign in to confirm')) {
                    return reject(new Error('YouTube requires login. Please try selecting a different browser or close the current one.'));
                }
                return reject(new Error(`yt-dlp failed: ${error}`));
            }
            const lines = output.trim().split('\n');
            const filename = lines[lines.length - 1].trim();
            resolve(filename);
        });
    });
}

const COBALT_INSTANCES = [
    'https://api.cobalt.tools',
    'https://co.wuk.sh',
    'https://cobalt.xy24.cn',
    'https://dl.khub.moe', // Additional instance
    'https://cobalt.canine.tools' // Additional instance
];

async function downloadWithCobalt(url, outputDir) {
    console.log('Trying fallback download via Cobalt API Swarm...');

    let lastError = null;

    // Shuffle instances to load balance slightly
    const shuffledInstances = [...COBALT_INSTANCES].sort(() => Math.random() - 0.5);

    for (const instance of shuffledInstances) {
        try {
            console.log(`Trying Cobalt instance: ${instance}`);
            const response = await axios.post(`${instance}/api/json`, {
                url: url,
                vCodec: "h264",
                vQuality: "1080",
                filenamePattern: "basic"
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 15000 // Increased timeout
            });

            let downloadUrl = null;
            let filename = null;

            if (response.data) {
                if (response.data.url) downloadUrl = response.data.url;
                else if (response.data.picker) downloadUrl = response.data.picker[0].url;

                filename = response.data.filename || `download-${Date.now()}.mp4`;
            }

            if (!downloadUrl) throw new Error('No URL in response');

            // Ensure filename ends with mp4
            if (!filename.endsWith('.mp4')) filename += '.mp4';

            const outputPath = path.join(outputDir, filename);

            console.log(`Downloading from ${instance}: ${downloadUrl}`);

            const writer = fs.createWriteStream(outputPath);
            const streamRes = await axios({
                url: downloadUrl,
                method: 'GET',
                responseType: 'stream'
            });

            streamRes.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(outputPath));
                writer.on('error', reject);
            });

        } catch (e) {
            console.warn(`Instance ${instance} failed: ${e.message}`);
            lastError = e;
            // Wait 1s between retries
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    throw new Error(`All Cobalt instances failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
}

async function processJob(job, updateProgress) {
    try {
        // Get video path - different jobs use different keys
        let videoPath = job.data.filePath || job.data.sourcePath;

        // Ensure absolute path (only if videoPath exists)
        if (videoPath && !path.isAbsolute(videoPath)) {
            videoPath = path.resolve(process.cwd(), videoPath);
        }

        // 1. Download if needed
        if (job.type === 'download_video') {
            updateProgress(10);
            const outputDir = path.join(__dirname, '../uploads');

            try {
                // Try yt-dlp first
                videoPath = await downloadVideo(job.data.url, outputDir);
            } catch (ytError) {
                console.error(`yt-dlp failed, trying Cobalt: ${ytError.message}`);
                // Fallback to Cobalt
                try {
                    videoPath = await downloadWithCobalt(job.data.url, outputDir);
                } catch (cobaltError) {
                    // Provide detailed error message
                    throw new Error(`Download failed.\n[yt-dlp]: ${ytError.message}\n[Cobalt]: ${cobaltError.message}`);
                }
            }

            job.data.filePath = videoPath;
            job.data.originalName = path.basename(videoPath);
            job.data.filename = path.basename(videoPath); // Required for frontend playback
            updateProgress(30);
        }

        // 2. Render Clip if requested
        if (job.type === 'render_clip') {
            const { sourcePath, start, end, ratio } = job.data;
            updateProgress(10);

            const outputFilename = `clip-${job.id}.mp4`;
            // Output to server/outputs folder
            const outputPath = path.join(__dirname, '../outputs', outputFilename);

            console.log(`Rendering clip to ${outputPath}`);

            const result = await runPython('render_clip.py', [
                sourcePath,
                String(start),
                String(end),
                String(ratio),
                outputPath,
                ffmpegPath // Pass ffmpeg path to python script
            ]);

            if (result && result.error) throw new Error(result.error);

            updateProgress(100);
            return { outputFilename, localPath: outputPath };
        }

        // 3. Analyze (Highlights)
        if (job.type === 'analyze_video' || job.type === 'process_upload' || job.type === 'download_video') {
            updateProgress(40);
            console.log(`Analyzing video: ${videoPath}`);

            const analysisResult = await runPython('detector.py', [
                videoPath,
                ffmpegPath
            ], (data) => {
                // Log progress from python script (verbose output)
                console.log(`[Detector]: ${data.trim()}`);
            });

            if (typeof analysisResult === 'string' && analysisResult.includes('error')) {
                throw new Error(analysisResult);
            }

            job.data.clips = analysisResult.clips || [];
            if (analysisResult.error) throw new Error(analysisResult.error);

            updateProgress(90);

            return {
                videoPath,
                clips: job.data.clips
            };
        }

        return {};

    } catch (err) {
        console.error("Processing Error:", err);
        throw err;
    }
}

module.exports = { processJob };
