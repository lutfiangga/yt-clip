const path = require('path');
const fs = require('fs');
const { runPython } = require('../utils/pythonRunner');
const { spawn } = require('child_process');

async function downloadVideo(url, outputDir) {
    return new Promise((resolve, reject) => {
        const filenameTemplate = path.join(outputDir, '%(title)s.%(ext)s');
        const args = [
            '-m', 'yt_dlp',
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', filenameTemplate,
            '-o', filenameTemplate,
            '--print', 'filename',
            '--no-simulate',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            url
        ];

        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        const proc = spawn(pythonCmd, args);
        let output = '';
        let error = '';

        proc.stdout.on('data', d => output += d.toString());
        proc.stderr.on('data', d => error += d.toString());

        proc.on('close', code => {
            if (code !== 0) {
                return reject(new Error(`yt-dlp failed: ${error}`));
            }
            const lines = output.trim().split('\n');
            const filename = lines[lines.length - 1].trim();
            resolve(filename);
        });
    });
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
            videoPath = await downloadVideo(job.data.url, outputDir);
            job.data.filePath = videoPath;
            job.data.originalName = path.basename(videoPath);
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
                outputPath
            ]);

            if (result && result.error) throw new Error(result.error);

            updateProgress(100);
            return { outputFilename, localPath: outputPath };
        }

        // 3. Analyze (Highlights)
        if (job.type === 'analyze_video' || job.type === 'process_upload' || job.type === 'download_video') {
            updateProgress(40);
            console.log(`Analyzing video: ${videoPath}`);

            const analysisResult = await runPython('detector.py', [videoPath], (data) => {
                console.log('Tokenizer:', data.substr(0, 50));
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
