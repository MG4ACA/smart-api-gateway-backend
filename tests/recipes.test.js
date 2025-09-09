const request = require('supertest');
const app = require('../server');

describe('Recipe Endpoints', () => {
  describe('GET /api/recipes/categories', () => {
    it('should get recipe categories successfully', async () => {
      const response = await request(app)
        .get('/api/recipes/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });

  describe('GET /api/recipes/random', () => {
    it('should get a random recipe successfully', async () => {
      const response = await request(app)
        .get('/api/recipes/random')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('recipe');
      expect(response.body.data.recipe).toHaveProperty('id');
      expect(response.body.data.recipe).toHaveProperty('name');
    });
  });

  describe('GET /api/recipes/search', () => {
    it('should search recipes successfully', async () => {
      const response = await request(app)
        .get('/api/recipes/search?q=chicken')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('recipes');
      expect(Array.isArray(response.body.data.recipes)).toBe(true);
    });

    it('should return error for empty search term', async () => {
      const response = await request(app)
        .get('/api/recipes/search?q=')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Missing search term');
    });

    it('should return error for short search term', async () => {
      const response = await request(app)
        .get('/api/recipes/search?q=a')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Search term too short');
    });
  });

  describe('GET /api/recipes/category/:category', () => {
    it('should get recipes by category successfully', async () => {
      const response = await request(app)
        .get('/api/recipes/category/Seafood')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('recipes');
      expect(response.body.data).toHaveProperty('category', 'Seafood');
      expect(Array.isArray(response.body.data.recipes)).toBe(true);
    });

    it('should return empty array for non-existent category', async () => {
      const response = await request(app)
        .get('/api/recipes/category/NonExistentCategory')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.recipes).toEqual([]);
    });
  });

  describe('GET /api/recipes/:id', () => {
    it('should get recipe by ID successfully', async () => {
      // Using a known recipe ID from TheMealDB
      const response = await request(app)
        .get('/api/recipes/52874')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('recipe');
      expect(response.body.data.recipe).toHaveProperty('id', '52874');
      expect(response.body.data.recipe).toHaveProperty('name');
      expect(response.body.data.recipe).toHaveProperty('ingredients');
    });

    it('should return 404 for non-existent recipe ID', async () => {
      const response = await request(app)
        .get('/api/recipes/999999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Recipe not found');
    });
  });
});
