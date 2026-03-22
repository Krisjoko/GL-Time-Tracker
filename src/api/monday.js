import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();

// Provide token for local development outside Monday.com
const apiToken = import.meta.env?.VITE_MONDAY_API_TOKEN;
if (apiToken) {
  monday.setToken(apiToken);
}

export default monday;
