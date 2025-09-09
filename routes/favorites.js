const express = require('express');
const {
  addFavorite,
  removeFavorite,
  getFavorites,
  checkFavorite,
  getFavoriteStats,
} = require('../controllers/favoriteController');
const { authenticateToken } = require('../middlewares/auth');
const { validateRecipeId } = require('../middlewares/validation');

const router = express.Router();

// All favorite routes require authentication
router.use(authenticateToken);

// Favorite CRUD operations
router.get('/', getFavorites);
router.get('/stats', getFavoriteStats);
router.get('/:recipeId/check', validateRecipeId, checkFavorite);
router.post('/:recipeId', validateRecipeId, addFavorite);
router.delete('/:recipeId', validateRecipeId, removeFavorite);

module.exports = router;
