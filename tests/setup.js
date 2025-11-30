import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = 'http://localhost:3001/api';
process.env.MCP_API_KEY = 'test-api-key';

// Create mock implementations that can be imported
export const mockServer = {
  setRequestHandler: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
};

export const mockStdioTransport = {};

export const mockAxios = {
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
};

export const mockFormData = {
  append: jest.fn(),
  getHeaders: jest.fn().mockReturnValue({}),
};

export const mockFs = {
  existsSync: jest.fn().mockReturnValue(true),
  createReadStream: jest.fn().mockReturnValue({}),
};

// Global test utilities
global.mockAxiosResponse = (data) => {
  mockAxios.get.mockResolvedValueOnce({ data });
  mockAxios.post.mockResolvedValueOnce({ data });
  mockAxios.put.mockResolvedValueOnce({ data });
  mockAxios.delete.mockResolvedValueOnce({ data });
};

global.mockAxiosError = (error) => {
  mockAxios.get.mockRejectedValueOnce(error);
  mockAxios.post.mockRejectedValueOnce(error);
  mockAxios.put.mockRejectedValueOnce(error);
  mockAxios.delete.mockRejectedValueOnce(error);
};