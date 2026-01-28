import axios from 'axios';

const API_URL = `http://${window.location.hostname}:3000/api`;

export const api = {
    uploadVideo: async (file) => {
        const formData = new FormData();
        formData.append('video', file);
        const res = await axios.post(`${API_URL}/jobs/upload`, formData);
        return res.data;
    },

    submitUrl: async (url) => {
        const res = await axios.post(`${API_URL}/jobs/url`, { url });
        return res.data;
    },

    getJobStatus: async (id) => {
        const res = await axios.get(`${API_URL}/jobs/${id}`);
        return res.data;
    },

    exportClip: async (jobId, clipData) => {
        // clipData: { start, end, ratio, ... }
        const res = await axios.post(`${API_URL}/jobs/export`, { jobId, ...clipData });
        return res.data;
    },

    getJobs: async () => {
        const res = await axios.get(`${API_URL}/jobs`);
        return res.data;
    }
};
