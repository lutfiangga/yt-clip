const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Directories
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'outputs');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/outputs', express.static(OUTPUT_DIR));

// Routes
app.use('/api/jobs', require('./routes/jobs'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/', (req, res) => {
    res.send('Clipper AI API is running. use /api/jobs for interactions.');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
