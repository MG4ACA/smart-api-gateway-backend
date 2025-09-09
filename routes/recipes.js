const express = require('express');
const {
  getRecipesByCategory,
  getRecipeById,
  searchRecipes,
  getCategories,
  getRandomRecipe
} = require('../controllers/recipeController');
const { validateCategory, validateRecipeId } = require('../middlewares/validation');
const { optionalAuth } = require('../middlewares/auth');

const router = express.Router();

// Public routes (with optional authentication for personalization)
router.get('/categories', getCategories);
router.get('/random', getRandomRecipe);
router.get('/search', searchRecipes);
router.get('/category/:category', validateCategory, optionalAuth, getRecipesByCategory);
router.get('/:id', validateRecipeId, optionalAuth, getRecipeById);

module.exports = router;