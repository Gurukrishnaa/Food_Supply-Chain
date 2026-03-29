// Global configuration values for the React frontend application
export const APP_CONFIG = {
  EC2_BACKEND_URL: import.meta.env.VITE_EC2_API_URL || 'http://localhost:3000/api',
  STACKS_NETWORK: import.meta.env.VITE_STACKS_NETWORK || 'testnet',
};
