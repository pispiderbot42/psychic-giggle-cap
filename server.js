const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 4004;

// Custom express middleware before CDS bootstrap
cds.on('bootstrap', (app) => {
  // Serve static files from app folder
  app.use(express.static(path.join(__dirname, 'app')));
  
  // RSS Feed proxy (to avoid CORS issues)
  app.get('/rss/fetch', async (req, res) => {
    const feedUrl = req.query.url;
    if (!feedUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    try {
      const response = await fetch(feedUrl);
      const xml = await response.text();
      res.set('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Speed test endpoints
  app.get('/speedtest/ping', (req, res) => {
    res.json({ timestamp: Date.now() });
  });
  
  app.get('/speedtest/download', (req, res) => {
    const size = parseInt(req.query.size) || 1024 * 1024;
    const chunk = Buffer.alloc(Math.min(size, 5 * 1024 * 1024), 'x');
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Length', chunk.length);
    res.set('Cache-Control', 'no-store');
    res.send(chunk);
  });
  
  app.post('/speedtest/upload', express.raw({ limit: '10mb', type: '*/*' }), (req, res) => {
    res.json({ 
      received: req.body ? req.body.length : 0,
      timestamp: Date.now()
    });
  });
});

// Start CDS server (handles DB connection automatically)
module.exports = cds.server;
