const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
  const { RssFeeds } = this.entities;
  
  // Ensure UUID is generated for new feeds
  this.before('CREATE', 'RssFeeds', async (req) => {
    if (!req.data.ID) {
      req.data.ID = cds.utils.uuid();
    }
  });
});
