import axios from 'axios';

const API_URL = '/api/deployments';

export const getAllDeployments = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const getProjectDeployments = async (projectId) => {
  const response = await axios.get(`/api/projects/${projectId}/deployments`);
  return response.data;
};

export const triggerDeployment = async (projectId, triggerType = 'MANUAL') => {
  const response = await axios.post(`/api/projects/${projectId}/deploy`, { triggerType });
  return response.data;
};

export const getDeploymentById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

export const getDeploymentLogs = async (id) => {
  const response = await axios.get(`${API_URL}/${id}/logs`);
  return response.data;
};

export const rollbackDeployment = async (id) => {
  const response = await axios.post(`${API_URL}/${id}/rollback`);
  return response.data;
};
