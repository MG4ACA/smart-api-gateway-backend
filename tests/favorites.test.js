const request = require('supertest');
const app = require('../server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Favorites Endpoints', () => {
  let authToken;
  let userId;
  const testRecipeId = '52874'; // Known recipe ID from TheMealDB

  const testUser = {
    name: 'Favorites Test User',
    email: 'favtest@example.com',
    password: 'Password123'
  };

  beforeAll(async () => {
    // Clean up
    await prisma.favorite.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });

    // Register and login test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.favorite.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
  });

  describe('POST /api/favorites/:recipeId', () => {
    it('should add recipe to favorites successfully', async () => {
      const response = await request(app)
        .post(`/api/favorites/${testRecipeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Recipe added to favorites');
      expect(response.body.data).toHaveProperty('favorite');
      expect(response.body.data).toHaveProperty('recipe');
      expect(response.body.data.favorite.recipeId).toBe(testRecipeId);
    });

    it('should not add same recipe to favorites twice', async () => {
      const response = await request(app)
        .post(`/api/favorites/${testRecipeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Already in favorites');
    });

    it('should not add favorite without authentication', async () => {
      const response = await request(app)
        .post(`/api/favorites/${testRecipeId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });

    it('should return 404 for non-existent recipe', async () => {
      const response = await request(app)
        .post('/api/favorites/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Recipe not found');
    });
  });

  describe('GET /api/favorites', () => {
    it('should get user favorites successfully', async () => {
      const response = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('favorites');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.favorites)).toBe(true);
      expect(response.body.data.favorites.length).toBeGreaterThan(0);
    });

    it('should not get favorites without authentication', async () => {
      const response = await request(app)
        .get('/api/favorites')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });
  });

  describe('GET /api/favorites/:recipeId/check', () => {
    it('should check if recipe is in favorites', async () => {
      const response = await request(app)
        .get(`/api/favorites/${testRecipeId}/check`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isFavorite', true);
      expect(response.body.data).toHaveProperty('favoriteId');
    });

    it('should return false for non-favorite recipe', async () => {
      const response = await request(app)
        .get('/api/favorites/52875/check')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isFavorite', false);
      expect(response.body.data.favoriteId).toBeNull();
    });
  });

  describe('GET /api/favorites/stats', () => {
    it('should get favorite statistics', async () => {
      const response = await request(app)
        .get('/api/favorites/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalFavorites');
      expect(response.body.data).toHaveProperty('recentCategories');
      expect(response.body.data).toHaveProperty('recentCount');
      expect(response.body.data.totalFavorites).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/favorites/:recipeId', () => {
    it('should remove recipe from favorites successfully', async () => {
      const response = await request(app)
        .delete(`/api/favorites/${testRecipeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Recipe removed from favorites');
      expect(response.body.data.recipeId).toBe(testRecipeId);
    });

    it('should return 404 when removing non-existent favorite', async () => {
      const response = await request(app)
        .delete(`/api/favorites/${testRecipeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Favorite not found');
    });

    it('should not remove favorite without authentication', async () => {
      const response = await request(app)
        .delete(`/api/favorites/${testRecipeId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });
  });
});
