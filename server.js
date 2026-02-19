const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

// Create tables manually after DB connection
cds.on('served', async () => {
  try {
    const db = await cds.connect.to('db');
    
    // Create tables manually
    await db.run(`
      CREATE TABLE IF NOT EXISTS HelloService_RssFeeds (
        ID TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        createdAt TEXT,
        modifiedAt TEXT
      )
    `);
    
    // Check if table is empty and insert sample data
    const count = await db.run(`SELECT COUNT(*) as cnt FROM HelloService_RssFeeds`);
    if (count[0]?.cnt === 0) {
      await db.run(`
        INSERT INTO HelloService_RssFeeds (ID, name, url, createdAt, modifiedAt) VALUES
        ('${cds.utils.uuid()}', 'SAP Community', 'https://community.sap.com/khhcw47422/rss/board?board.id=technology-blog-sap', datetime('now'), datetime('now')),
        ('${cds.utils.uuid()}', 'Hacker News', 'https://news.ycombinator.com/rss', datetime('now'), datetime('now')),
        ('${cds.utils.uuid()}', 'TechCrunch', 'https://techcrunch.com/feed/', datetime('now'), datetime('now'))
      `);
      console.log('Sample feeds inserted');
    }
    
    console.log('Database tables ready');
  } catch (err) {
    console.error('DB setup error:', err.message);
  }
});

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

// Start CDS server
module.exports = cds.server;
