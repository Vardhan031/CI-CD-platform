/**
 * Jenkins API Configuration & Credentials
 */
require('dotenv').config();

const jenkinsConfig = {
  url: process.env.JENKINS_URL || 'http://localhost:8080',
  user: process.env.JENKINS_USER || 'admin',
  token: process.env.JENKINS_TOKEN || 'admin_token',
  
  // Helper to generate HTTP Basic Auth headers for Jenkins REST API calls
  getAuthHeader: () => {
    const authString = `${process.env.JENKINS_USER || 'admin'}:${process.env.JENKINS_TOKEN || 'admin_token'}`;
    const base64Auth = Buffer.from(authString).toString('base64');
    return {
      Authorization: `Basic ${base64Auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  },
};

module.exports = jenkinsConfig;
