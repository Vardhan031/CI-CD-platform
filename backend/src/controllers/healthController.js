/**
 * Health Controller
 * Provides basic health status endpoint for monitoring application uptime
 */
const getHealthStatus = (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CI/CD Deployment Platform REST API',
    environment: process.env.NODE_ENV || 'development'
  });
};

module.exports = {
  getHealthStatus
};
