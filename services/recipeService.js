const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const redisClient = require('../config/redis');

const prisma = new PrismaClient();

class RecipeService {
  constructor() {
    this.baseURL = process.env.THEMEALDB_API_URL || 'https://www.themealdb.com/api/json/v1/1';
    // Cache TTL in seconds (default 1 hour)
    this.cacheTTL = parseInt(process.env.RECIPE_CACHE_TTL_SECONDS, 10) || 3600;
  }

  /**
   * Fetch recipe by ID from external API
   * @param {string} recipeId - Recipe ID
   * @returns {Object} Recipe data
   */
  async fetchRecipeById(recipeId) {
    const cacheKey = `recipe:${recipeId}`;
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        // console.log(`CACHE HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }

      const response = await axios.get(`${this.baseURL}/lookup.php?i=${recipeId}`);

      if (!response.data.meals || response.data.meals.length === 0) {
        return null;
      }

      const meal = response.data.meals[0];
      const transformed = this.transformMealData(meal);

      // Store in cache
      try {
        await redisClient.setEx(cacheKey, this.cacheTTL, JSON.stringify(transformed));
      } catch (cacheErr) {
        console.warn('Failed to set recipe cache:', cacheErr.message || cacheErr);
      }

      return transformed;
    } catch (error) {
      console.error('Error fetching recipe by ID:', error);
      throw new Error('Failed to fetch recipe from external API');
    }
  }

  /**
   * Fetch recipes by category from external API
   * @param {string} category - Recipe category
   * @returns {Array} Array of recipe data
   */
  async fetchRecipesByCategory(category) {
    const cacheKey = `recipes:category:${String(category).toLowerCase()}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        // console.log(`CACHE HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }

      const response = await axios.get(`${this.baseURL}/filter.php?c=${category}`);

      if (!response.data.meals || response.data.meals.length === 0) {
        return [];
      }

      const result = response.data.meals.map((meal) => ({
        id: meal.idMeal,
        name: meal.strMeal,
        thumbnail: meal.strMealThumb,
        category: category,
      }));

      try {
        await redisClient.setEx(cacheKey, this.cacheTTL, JSON.stringify(result));
      } catch (cacheErr) {
        console.warn('Failed to set category cache:', cacheErr.message || cacheErr);
      }

      return result;
    } catch (error) {
      console.error('Error fetching recipes by category:', error);
      throw new Error('Failed to fetch recipes from external API');
    }
  }

  /**
   * Search recipes by name from external API
   * @param {string} searchTerm - Search term
   * @returns {Array} Array of recipe data
   */
  async searchRecipes(searchTerm) {
    const cacheKey = `recipes:search:${String(searchTerm).toLowerCase()}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        // console.log(`CACHE HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }

      const response = await axios.get(`${this.baseURL}/search.php?s=${searchTerm}`);

      if (!response.data.meals || response.data.meals.length === 0) {
        return [];
      }

      const result = response.data.meals.map((meal) => this.transformMealData(meal));

      try {
        await redisClient.setEx(cacheKey, this.cacheTTL, JSON.stringify(result));
      } catch (cacheErr) {
        console.warn('Failed to set search cache:', cacheErr.message || cacheErr);
      }

      return result;
    } catch (error) {
      console.error('Error searching recipes:', error);
      throw new Error('Failed to search recipes from external API');
    }
  }

  /**
   * Get recipe categories from external API
   * @returns {Array} Array of categories
   */
  async getCategories() {
    const cacheKey = 'recipes:categories';
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        // console.log(`CACHE HIT: ${cacheKey}`);
        return JSON.parse(cached);
      }

      const response = await axios.get(`${this.baseURL}/categories.php`);

      if (!response.data.categories) {
        return [];
      }

      const result = response.data.categories.map((category) => ({
        id: category.idCategory,
        name: category.strCategory,
        thumbnail: category.strCategoryThumb,
        description: category.strCategoryDescription,
      }));

      try {
        await redisClient.setEx(cacheKey, this.cacheTTL, JSON.stringify(result));
      } catch (cacheErr) {
        console.warn('Failed to set categories cache:', cacheErr.message || cacheErr);
      }

      return result;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories from external API');
    }
  }

  /**
   * Get random recipe from external API
   * @returns {Object} Random recipe data
   */
  async getRandomRecipe() {
    try {
      const response = await axios.get(`${this.baseURL}/random.php`);

      if (!response.data.meals || response.data.meals.length === 0) {
        return null;
      }

      const meal = response.data.meals[0];
      return this.transformMealData(meal);
    } catch (error) {
      console.error('Error fetching random recipe:', error);
      throw new Error('Failed to fetch random recipe from external API');
    }
  }

  /**
   * Get recipe with caching
   * @param {string} recipeId - Recipe ID
   * @returns {Object} Recipe data
   */
  async getRecipeWithCache(recipeId) {
    try {
      // Check cache first
      const cachedRecipe = await prisma.recipe.findUnique({
        where: { externalId: recipeId },
      });

      // If cached and not expired, return cached data
      if (cachedRecipe && this.isCacheValid(cachedRecipe.cachedAt)) {
        return this.transformCachedRecipe(cachedRecipe);
      }

      // Fetch from external API
      const recipeData = await this.fetchRecipeById(recipeId);

      if (!recipeData) {
        return null;
      }

      // Cache the recipe
      await this.cacheRecipe(recipeData);

      return recipeData;
    } catch (error) {
      console.error('Error getting recipe with cache:', error);
      // If external API fails, try to return cached data even if expired
      const cachedRecipe = await prisma.recipe.findUnique({
        where: { externalId: recipeId },
      });

      if (cachedRecipe) {
        return this.transformCachedRecipe(cachedRecipe);
      }

      throw error;
    }
  }

  /**
   * Cache recipe in database
   * @param {Object} recipeData - Recipe data to cache
   */
  async cacheRecipe(recipeData) {
    try {
      await prisma.recipe.upsert({
        where: { externalId: recipeData.id },
        update: {
          name: recipeData.name,
          category: recipeData.category,
          area: recipeData.area,
          instructions: recipeData.instructions,
          thumbnail: recipeData.thumbnail,
          ingredients: recipeData.ingredients,
          updatedAt: new Date(),
        },
        create: {
          externalId: recipeData.id,
          name: recipeData.name,
          category: recipeData.category,
          area: recipeData.area,
          instructions: recipeData.instructions,
          thumbnail: recipeData.thumbnail,
          ingredients: recipeData.ingredients,
        },
      });
    } catch (error) {
      console.error('Error caching recipe:', error);
      // Don't throw error, caching is not critical
    }
  }

  /**
   * Transform meal data from external API
   * @param {Object} meal - Raw meal data from API
   * @returns {Object} Transformed recipe data
   */
  transformMealData(meal) {
    // Extract ingredients
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (ingredient && ingredient.trim()) {
        ingredients.push({
          name: ingredient.trim(),
          measure: measure ? measure.trim() : '',
        });
      }
    }

    return {
      id: meal.idMeal,
      name: meal.strMeal,
      category: meal.strCategory,
      area: meal.strArea,
      instructions: meal.strInstructions,
      thumbnail: meal.strMealThumb,
      tags: meal.strTags ? meal.strTags.split(',').map((tag) => tag.trim()) : [],
      youtube: meal.strYoutube,
      source: meal.strSource,
      ingredients,
    };
  }

  /**
   * Transform cached recipe data
   * @param {Object} cachedRecipe - Cached recipe from database
   * @returns {Object} Transformed recipe data
   */
  transformCachedRecipe(cachedRecipe) {
    return {
      id: cachedRecipe.externalId,
      name: cachedRecipe.name,
      category: cachedRecipe.category,
      area: cachedRecipe.area,
      instructions: cachedRecipe.instructions,
      thumbnail: cachedRecipe.thumbnail,
      ingredients: cachedRecipe.ingredients,
      cached: true,
      cachedAt: cachedRecipe.cachedAt,
    };
  }

  /**
   * Check if cached data is still valid
   * @param {Date} cachedAt - When the data was cached
   * @returns {boolean} Whether cache is valid
   */
  isCacheValid(cachedAt) {
    const now = new Date();
    const cacheAge = now - new Date(cachedAt);
    return cacheAge < this.cacheTimeout;
  }
}

module.exports = new RecipeService();
