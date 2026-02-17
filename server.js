const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 4004;

async function start() {
  const app = express();
  
  // Serve static files from app folder
  app.use(express.static(path.join(__dirname, 'app')));
  
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
