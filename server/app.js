// app.js
// Entry point for the TikTok Downloader backend server.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const downloadRoutes = require('./routes/download');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Global middleware ---
app.use(cors());
app.use(express.json());

// Serve the frontend (client folder) as static files so the whole
// app can run from a single server during development.
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- API routes ---
app.use('/api', downloadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running.' });
});

// --- 404 handler for unknown API routes ---
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// --- Global error handler (never leak internal error details) ---
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
