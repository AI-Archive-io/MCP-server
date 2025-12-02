import BaseServerUtils from './src/utils/baseServer.js';

const utils = new BaseServerUtils();
utils._ensureInitialized();

console.log('Environment:', utils.environment);
console.log('API Base URL:', utils.apiBaseUrl);
console.log('API Key:', utils.apiKey ? '✅ Found' : '❌ Not found');
console.log('API Key value (first 20 chars):', utils.apiKey ? utils.apiKey.substring(0, 20) : 'N/A');
