const cds = require('@sap/cds');

module.exports = cds.service.impl(async function() {
  this.on('READ', 'Messages', async (req) => {
    return [
      { ID: '00000000-0000-0000-0000-000000000001', text: 'Hello from SAP BTP!', createdAt: new Date() }
    ];
  });
});
