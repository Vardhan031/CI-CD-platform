const axios = require('axios');

/**
 * Health Check Verification Service
 * Probes deployed application containers to verify operational readiness
 */
const verifyApplicationHealth = async (port, healthPath = '/health') => {
  const startTime = Date.now();
  const targetUrl = `http://localhost:${port}${healthPath}`;

  try {
    console.log(`[Health Check Service] Probing container endpoint: ${targetUrl}`);

    const response = await axios.get(targetUrl, {
      timeout: 3000,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const responseTimeMs = Date.now() - startTime;

    return {
      healthy: true,
      statusCode: response.status,
      responseTimeMs,
      data: response.data,
      message: `Container health check PASSED (HTTP ${response.status} in ${responseTimeMs}ms)`,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.warn(`[Health Check Warning] Probing failed for ${targetUrl}: ${error.message}`);

    return {
      healthy: false,
      statusCode: error.response?.status || 500,
      responseTimeMs,
      error: error.message,
      message: `Container health check FAILED (${error.message})`,
    };
  }
};

module.exports = {
  verifyApplicationHealth,
};
