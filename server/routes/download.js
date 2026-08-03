// routes/download.js
// Route module responsible for proxying TikTok download requests
// to the third-party API, so the frontend never talks to it directly.

const express = require('express');
const axios = require('axios');

const router = express.Router();

// Base URL of the third-party TikTok download API
const THIRD_PARTY_API = 'https://api.saipulanuar.eu.org/api/download/ttdl';

// Basic pattern to catch obviously-invalid URLs before we waste an
// outbound request. TikTok links can come from tiktok.com or the
// short vt.tiktok.com / vm.tiktok.com domains.
const TIKTOK_URL_PATTERN = /^https?:\/\/(www\.|vt\.|vm\.|m\.)?tiktok\.com\/.+/i;

/**
 * GET /api/tiktok?url=<tiktok-url>
 *
 * Validates the incoming URL, forwards the request to the third-party
 * API, normalizes the response into a clean, predictable shape, and
 * returns it to the client.
 */
router.get('/tiktok', async (req, res) => {
  const { url } = req.query;

  // 1. Validate presence of the URL
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'URL is required.',
    });
  }

  const trimmedUrl = url.trim();

  // 2. Validate the URL actually looks like a TikTok link
  if (!TIKTOK_URL_PATTERN.test(trimmedUrl)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid TikTok URL.',
    });
  }

  try {
    // 3. Forward the request to the third-party API with a timeout
    //    so a slow upstream never hangs our server indefinitely.
    const response = await axios.get(THIRD_PARTY_API, {
      params: { url: trimmedUrl },
      timeout: 15000, // 15 seconds
    });

    const data = response.data;

    // The third-party API's exact shape can vary, so we defensively
    // pull out the fields we need instead of trusting a fixed shape.
    const result = data?.result || data?.data || data;

    const title = result?.title || result?.desc || 'TikTok Video';
    const thumbnail = result?.cover || result?.thumbnail || result?.image || null;
    const video = result?.video || result?.play || result?.no_watermark || null;
    const audio = result?.music || result?.audio || null;

    if (!video && !audio) {
      // Upstream responded, but didn't give us anything usable.
      return res.status(502).json({
        success: false,
        message: 'Failed to fetch TikTok data.',
      });
    }

    // 4. Return a clean, normalized JSON response
    return res.status(200).json({
      success: true,
      title,
      thumbnail,
      video,
      audio,
    });
  } catch (error) {
    // Never leak internal error details (stack traces, upstream
    // response bodies, etc.) back to the client.
    const isTimeout = error.code === 'ECONNABORTED';

    return res.status(isTimeout ? 504 : 502).json({
      success: false,
      message: 'Failed to fetch TikTok data.',
    });
  }
});

module.exports = router;
