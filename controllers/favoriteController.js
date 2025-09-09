const { PrismaClient } = require('@prisma/client');
const recipeService = require('../services/recipeService');
const { asyncHandler } = require('../middlewares/errorHandler');

const prisma = new PrismaClient();

/**
 * Add recipe to user's favorites
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addFavorite = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  const { userId } = req.user;

  // Verify recipe exists by fetching from external API
  const recipe = await recipeService.fetchRecipeById(recipeId);

  if (!recipe) {
    return res.status(404).json({
      success: false,
      error: 'Recipe not found',
      message: 'The specified recipe does not exist',
    });
  }

  // Cache the recipe if it's not already cached
  await recipeService.cacheRecipe(recipe);

  // Check if already in favorites
  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_recipeId: {
        userId,
        recipeId,
      },
    },
  });

  if (existingFavorite) {
    return res.status(409).json({
      success: false,
      error: 'Already in favorites',
      message: 'This recipe is already in your favorites',
    });
  }

  // Add to favorites
  const favorite = await prisma.favorite.create({
    data: {
      userId,
      recipeId,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Recipe added to favorites',
    data: {
      favorite: {
        id: favorite.id,
        recipeId: favorite.recipeId,
        createdAt: favorite.createdAt,
      },
      recipe: {
        id: recipe.id,
        name: recipe.name,
        thumbnail: recipe.thumbnail,
        category: recipe.category,
      },
    },
  });
});

/**
 * Remove recipe from user's favorites
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const removeFavorite = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  const { userId } = req.user;

  // Check if favorite exists
  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_recipeId: {
        userId,
        recipeId,
      },
    },
  });

  if (!favorite) {
    return res.status(404).json({
      success: false,
      error: 'Favorite not found',
      message: 'This recipe is not in your favorites',
    });
  }

  // Remove from favorites
  await prisma.favorite.delete({
    where: {
      id: favorite.id,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Recipe removed from favorites',
    data: {
      recipeId,
    },
  });
});

/**
 * Get user's favorite recipes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getFavorites = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { limit = 20, offset = 0 } = req.query;

  // Get favorites with pagination
  const [favorites, totalCount] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(offset),
      take: parseInt(limit),
    }),
    prisma.favorite.count({
      where: { userId },
    }),
  ]);

  // Fetch recipe details for each favorite
  const favoritesWithRecipes = await Promise.all(
    favorites.map(async (favorite) => {
      try {
        const recipe = await recipeService.getRecipeWithCache(favorite.recipeId);
        return {
          id: favorite.id,
          recipeId: favorite.recipeId,
          createdAt: favorite.createdAt,
          recipe: recipe
            ? {
                id: recipe.id,
                name: recipe.name,
                thumbnail: recipe.thumbnail,
                category: recipe.category,
                area: recipe.area,
              }
            : null,
        };
      } catch (error) {
        console.error(`Error fetching recipe ${favorite.recipeId}:`, error);
        return {
          id: favorite.id,
          recipeId: favorite.recipeId,
          createdAt: favorite.createdAt,
          recipe: null,
        };
      }
    })
  );

  res.status(200).json({
    success: true,
    data: {
      favorites: favoritesWithRecipes,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < totalCount,
      },
    },
  });
});

/**
 * Check if recipe is in user's favorites
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkFavorite = asyncHandler(async (req, res) => {
  const { recipeId } = req.params;
  const { userId } = req.user;

  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_recipeId: {
        userId,
        recipeId,
      },
    },
  });

  res.status(200).json({
    success: true,
    data: {
      isFavorite: !!favorite,
      favoriteId: favorite?.id || null,
    },
  });
});

/**
 * Get user's favorite statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getFavoriteStats = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const [totalFavorites, recentFavorites] = await Promise.all([
    prisma.favorite.count({
      where: { userId },
    }),
    prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // Get categories of recent favorites
  const recentRecipes = await Promise.all(
    recentFavorites.map(async (favorite) => {
      try {
        const recipe = await recipeService.getRecipeWithCache(favorite.recipeId);
        return recipe?.category || null;
      } catch (error) {
        return null;
      }
    })
  );

  const categoryStats = recentRecipes
    .filter((category) => category !== null)
    .reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

  res.status(200).json({
    success: true,
    data: {
      totalFavorites,
      recentCategories: categoryStats,
      recentCount: recentFavorites.length,
    },
  });
});

module.exports = {
  addFavorite,
  removeFavorite,
  getFavorites,
  checkFavorite,
  getFavoriteStats,
};
