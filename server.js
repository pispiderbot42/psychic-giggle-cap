const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 4004;

async function start() {
  const app = express();
  
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
  
  // Download test - returns ~1MB of data
  app.get('/speedtest/download', (req, res) => {
    const size = parseInt(req.query.size) || 1024 * 1024; // 1MB default
    const chunk = Buffer.alloc(Math.min(size, 5 * 1024 * 1024), 'x'); // max 5MB
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Length', chunk.length);
    res.set('Cache-Control', 'no-store');
    res.send(chunk);
  });
  
  // Upload test - accepts data and returns timing
  app.post('/speedtest/upload', express.raw({ limit: '10mb', type: '*/*' }), (req, res) => {
    res.json({ 
      received: req.body ? req.body.length : 0,
      timestamp: Date.now()
    });
  });
  
  // Deploy database schema and initial data before serving
  try {
    await cds.deploy('./db').to('sqlite:db.sqlite');
    console.log('Database deployed successfully');
  } catch (err) {
    console.error('Database deploy error:', err.message);
  }
  
  // Bootstrap CDS
  await cds.serve('all').in(app);
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
