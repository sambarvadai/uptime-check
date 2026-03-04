import axios from 'axios';

const BASE_URL = window.__API_BASE__ || 'http://localhost:5000';

const client = axios.create({
  baseURL: BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = (username, password) =>
  client.post('/api/login', { username, password }).then((r) => r.data);

export const register = (username, password) =>
  client.post('/api/register', { username, password }).then((r) => r.data);

export const getMonitors = () => client.get('/api/getAllMonitors').then((r) => r.data);

export const createMonitor = (payload) => client.post('/api/monitors', payload).then((r) => r.data);

export const updateMonitor = (id, payload) =>
  client.put(`/api/updateMonitorById/${id}`, payload).then((r) => r.data);

export const deleteMonitor = (id) => client.delete(`/api/deleteMonitorById/${id}`);
