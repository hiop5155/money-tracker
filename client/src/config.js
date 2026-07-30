const protocol = window.location.protocol;
const hostname = window.location.hostname;
const BACKEND_PORT = 5001;

const defaultApiUrl = import.meta.env.DEV 
  ? `${protocol}//${hostname}:${BACKEND_PORT}/api`
  : '/api';

export const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

