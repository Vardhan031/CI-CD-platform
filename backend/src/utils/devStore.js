/**
 * Shared In-Memory Data Store for Development Mode (Offline DB Fallback)
 */
const inMemoryUsers = new Map();
const inMemoryProjects = new Map();
const inMemoryDeployments = new Map();
const inMemoryBuilds = new Map();
const inMemoryLogs = new Map();

module.exports = {
  inMemoryUsers,
  inMemoryProjects,
  inMemoryDeployments,
  inMemoryBuilds,
  inMemoryLogs,
};
