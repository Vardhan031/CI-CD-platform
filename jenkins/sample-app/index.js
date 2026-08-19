const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Sample NodeShop API Service is running!',
    version: process.env.VERSION || 'v1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    service: 'sample-nodeshop-api',
  });
});

app.listen(PORT, () => {
  console.log(`[Sample App] Listening on port ${PORT}`);
});
