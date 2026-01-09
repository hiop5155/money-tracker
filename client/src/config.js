const protocol = window.location.protocol;
const hostname = window.location.hostname;
const BACKEND_PORT = 5001;
export const API_URL = import.meta.env.VITE_API_URL || `${protocol}//${hostname}:${BACKEND_PORT}/api`;
