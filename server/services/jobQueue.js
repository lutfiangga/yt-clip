const { v4: uuidv4 } = require('uuid');
const { processJob } = require('./processor');
const db = require('./db');

class JobQueue {
    constructor() {
        this.jobs = new Map();
        this.queue = [];
        this.processing = false;

        // Load persisted pending jobs? For now just start fresh for queue, but history is there.
        // Ideally we would re-queue pending jobs on startup.
    }

    addJob(type, data) {
        const id = uuidv4();
        const job = {
            id,
            type,
            data,
            status: 'pending',
            progress: 0,
            result: null,
            error: null,
            createdAt: new Date(),
        };

        this.jobs.set(id, job);
        // Persist
        db.insertJob(job);

        this.queue.push(id);
        this.processNext();

        return job;
    }

    getJob(id) {
        // Check memory first, then DB
        if (this.jobs.has(id)) return this.jobs.get(id);
        return db.getJob(id);
    }

    getAllJobs() {
        return db.getAllJobs();
    }

    async processNext() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const jobId = this.queue.shift();
        const job = this.jobs.get(jobId);

        if (!job) {
            this.processing = false;
            return;
        }

        try {
            job.status = 'processing';
            job.startTime = new Date();
            db.updateJob(job);

            const result = await processJob(job, (p) => {
                job.progress = p;
                // Optional: debounce update to DB
                // db.updateJob(job); 
            });

            job.data = { ...job.data, ...result };
            job.status = 'completed';
            job.progress = 100;
            job.result = result;

            db.updateJob(job);

        } catch (err) {
            job.status = 'failed';
            job.error = err.message;
            console.error(`Job ${jobId} failed:`, err);
            db.updateJob(job);
        } finally {
            job.endTime = new Date();
            this.processing = false;
            this.processNext();
        }
    }
}

module.exports = new JobQueue();
