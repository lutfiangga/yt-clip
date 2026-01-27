const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../jobs.db');
const db = new Database(dbPath);

// Init DB
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT,
    status TEXT,
    progress INTEGER,
    data TEXT,
    result TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const stmtInsert = db.prepare(`
    INSERT INTO jobs (id, type, status, progress, data, result, error, created_at)
    VALUES (@id, @type, @status, @progress, @data, @result, @error, @created_at)
`);

const stmtUpdate = db.prepare(`
    UPDATE jobs 
    SET status = @status, progress = @progress, result = @result, error = @error
    WHERE id = @id
`);

const stmtGet = db.prepare('SELECT * FROM jobs WHERE id = ?');
const stmtAll = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC');

module.exports = {
    insertJob: (job) => {
        stmtInsert.run({
            ...job,
            data: JSON.stringify(job.data),
            result: JSON.stringify(job.result),
            created_at: job.createdAt.toISOString()
        });
    },
    updateJob: (job) => {
        stmtUpdate.run({
            id: job.id,
            status: job.status,
            progress: job.progress,
            result: JSON.stringify(job.result),
            error: job.error
        });
    },
    getJob: (id) => {
        const row = stmtGet.get(id);
        if (!row) return null;
        return {
            ...row,
            data: JSON.parse(row.data),
            result: JSON.parse(row.result),
            createdAt: new Date(row.created_at)
        };
    },
    getAllJobs: () => {
        return stmtAll.all().map(row => ({
            ...row,
            data: JSON.parse(row.data),
            result: JSON.parse(row.result),
            createdAt: new Date(row.created_at)
        }));
    }
};
