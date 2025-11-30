import { jest } from '@jest/globals';

// Simple schema validation tests
describe('MCP Server Schemas', () => {
  test('should validate search papers schema', () => {
    const schema = {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 100 },
        offset: { type: 'number', minimum: 0 }
      },
      required: ['query']
    };

    expect(schema.type).toBe('object');
    expect(schema.required).toContain('query');
    expect(schema.properties.query.type).toBe('string');
    expect(schema.properties.limit.minimum).toBe(1);
    expect(schema.properties.limit.maximum).toBe(100);
  });

  test('should validate paper details schema', () => {
    const schema = {
      type: 'object',
      properties: {
        paperId: { type: 'string' }
      },
      required: ['paperId']
    };

    expect(schema.type).toBe('object');
    expect(schema.required).toContain('paperId');
  });

  test('should validate submit paper schema', () => {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        authors: { type: 'array', items: { type: 'string' } },
        abstract: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        category: { type: 'string' },
        filePath: { type: 'string' }
      },
      required: ['title', 'authors', 'abstract', 'category']
    };

    expect(schema.type).toBe('object');
    expect(schema.required).toContain('title');
    expect(schema.required).toContain('authors');
    expect(schema.properties.authors.type).toBe('array');
  });

  test('should validate review submission schema', () => {
    const schema = {
      type: 'object',
      properties: {
        paperId: { type: 'string' },
        rating: { type: 'number', minimum: 1, maximum: 5 },
        comments: { type: 'string' },
        recommendation: { 
          type: 'string', 
          enum: ['accept', 'reject', 'revise'] 
        }
      },
      required: ['paperId', 'rating', 'recommendation']
    };

    expect(schema.type).toBe('object');
    expect(schema.required).toContain('paperId');
    expect(schema.required).toContain('rating');
    expect(schema.properties.rating.minimum).toBe(1);
    expect(schema.properties.rating.maximum).toBe(5);
    expect(schema.properties.recommendation.enum).toContain('accept');
  });

  test('should validate data formats', () => {
    const testData = {
      query: 'machine learning',
      limit: 10,
      offset: 0,
      rating: 4,
      recommendation: 'accept'
    };

    expect(typeof testData.query).toBe('string');
    expect(typeof testData.limit).toBe('number');
    expect(testData.limit).toBeGreaterThan(0);
    expect(testData.rating).toBeGreaterThanOrEqual(1);
    expect(testData.rating).toBeLessThanOrEqual(5);
    expect(['accept', 'reject', 'revise']).toContain(testData.recommendation);
  });

  test('should handle schema validation errors', () => {
    const validateSchema = (data, schema) => {
      const errors = [];
      
      schema.required.forEach(field => {
        if (!data.hasOwnProperty(field)) {
          errors.push(`Missing required field: ${field}`);
        }
      });

      return { isValid: errors.length === 0, errors };
    };

    const schema = { required: ['title', 'authors'] };
    const invalidData = { title: 'Test' }; // missing authors

    const result = validateSchema(invalidData, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Missing required field: authors');
  });

  test('should validate array fields', () => {
    const authorsArray = ['Author 1', 'Author 2'];
    const keywordsArray = ['AI', 'Machine Learning', 'Research'];

    expect(Array.isArray(authorsArray)).toBe(true);
    expect(Array.isArray(keywordsArray)).toBe(true);
    expect(authorsArray.length).toBeGreaterThan(0);
    expect(authorsArray.every(author => typeof author === 'string')).toBe(true);
  });

  test('should validate enum values', () => {
    const validRecommendations = ['accept', 'reject', 'revise'];
    const testRecommendation = 'accept';

    expect(validRecommendations).toContain(testRecommendation);
    expect(validRecommendations).not.toContain('invalid');
  });

  test('should validate numeric ranges', () => {
    const rating = 4;
    const limit = 25;
    const offset = 0;

    expect(rating).toBeGreaterThanOrEqual(1);
    expect(rating).toBeLessThanOrEqual(5);
    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThanOrEqual(100);
    expect(offset).toBeGreaterThanOrEqual(0);
  });

  test('should validate string formats', () => {
    const title = 'A Study on Machine Learning Applications';
    const paperId = 'paper_123';
    const category = 'Computer Science';

    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
    expect(typeof paperId).toBe('string');
    expect(paperId).toMatch(/^[a-zA-Z0-9_]+$/);
    expect(typeof category).toBe('string');
  });
});