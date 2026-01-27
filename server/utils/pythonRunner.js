const { spawn } = require('child_process');
const path = require('path');

const PYTHON_DIR = path.join(__dirname, '../../python');

/**
 * Runs a Python script with arguments
 * @param {string} scriptName - Name of the script in python/ dir
 * @param {string[]} args - List of arguments
 * @param {function} onData - Callback for stdout data (realtime logging)
 * @returns {Promise<any>}
 */
function runPython(scriptName, args = [], onData = null) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(PYTHON_DIR, scriptName);

        // Use local venv Python if available, otherwise fallback to system Python
        const venvPython = path.join(PYTHON_DIR, '../.venv/Scripts/python.exe');
        const pythonCmd = require('fs').existsSync(venvPython)
            ? venvPython
            : (process.platform === 'win32' ? 'python' : 'python3');

        console.log(`Executing: ${pythonCmd} ${scriptPath} ${args.join(' ')}`);

        const pyProcess = spawn(pythonCmd, [scriptPath, ...args]);

        let output = '';
        let errorOutput = '';

        pyProcess.stdout.on('data', (data) => {
            const distinctData = data.toString();
            output += distinctData;
            if (onData) onData(distinctData);
        });

        pyProcess.stderr.on('data', (data) => {
            const distinctData = data.toString();
            errorOutput += distinctData;
            console.error(`[Python API] ${distinctData}`);
        });

        pyProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python script exited with code ${code}: ${errorOutput}`));
            } else {
                try {
                    // Attempt to parse JSON if possible, otherwise return string
                    // Many scripts will print JSON as the last line
                    const lines = output.trim().split('\n');
                    const lastLine = lines[lines.length - 1];
                    try {
                        resolve(JSON.parse(lastLine));
                    } catch (e) {
                        resolve(output);
                    }
                } catch (e) {
                    resolve(output);
                }
            }
        });

        pyProcess.on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = { runPython };
