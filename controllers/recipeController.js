const recipeService = require('../services/recipeService');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Get recipes by category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecipesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const recipes = await recipeService.fetchRecipesByCategory(category);

  // Apply pagination
  const paginatedRecipes = recipes.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      recipes: paginatedRecipes,
      pagination: {
        total: recipes.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < recipes.length,
      },
      category,
    },
  });
});

/**
 * Get recipe by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRecipeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const recipe = await recipeService.getRecipeWithCache(id);

  if (!recipe) {
    return res.status(404).json({
      success: false,
      error: 'Recipe not found',
      message: 'The requested recipe could not be found',
    });
  }

  res.status(200).json({
    success: true,
    data: {
      recipe,
    },
  });
});

/**
 * Search recipes by name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchRecipes = asyncHandler(async (req, res) => {
  const { q: searchTerm } = req.query;
  const { limit = 20, offset = 0 } = req.query;

  if (!searchTerm || searchTerm.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing search term',
      message: 'Please provide a search term',
    });
  }

  if (searchTerm.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Search term too short',
      message: 'Search term must be at least 2 characters long',
    });
  }

  const recipes = await recipeService.searchRecipes(searchTerm);

  // Apply pagination
  const paginatedRecipes = recipes.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      recipes: paginatedRecipes,
      pagination: {
        total: recipes.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < recipes.length,
      },
      searchTerm,
    },
  });
});

/**
 * Get recipe categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await recipeService.getCategories();

  res.status(200).json({
    success: true,
    data: {
      categories,
    },
  });
});

/**
 * Get random recipe
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getRandomRecipe = asyncHandler(async (req, res) => {
  const recipe = await recipeService.getRandomRecipe();

  if (!recipe) {
    return res.status(404).json({
      success: false,
      error: 'No recipe found',
      message: 'Could not fetch a random recipe',
    });
  }

  res.status(200).json({
    success: true,
    data: {
      recipe,
    },
  });
});

module.exports = {
  getRecipesByCategory,
  getRecipeById,
  searchRecipes,
  getCategories,
  getRandomRecipe,
};
