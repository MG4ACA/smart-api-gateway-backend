const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const prisma = new PrismaClient();

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  static async create(userData) {
    const { name, email, password } = userData;

    // Validation
    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required');
    }

    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword
      }
    });

    return user;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object|null} User or null
   */
  static async findByEmail(email) {
    if (!email || !validator.isEmail(email)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    return user;
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Object|null} User or null
   */
  static async findById(id) {
    if (!id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { favorites: true }
        }
      }
    });

    return user;
  }

  /**
   * Validate password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {boolean} Whether password is valid
   */
  static async validatePassword(password, hashedPassword) {
    if (!password || !hashedPassword) {
      return false;
    }

    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user
   */
  static async updateProfile(userId, updateData) {
    const allowedFields = ['name'];
    const filteredData = {};

    // Only allow specific fields to be updated
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Validate name if provided
    if (filteredData.name && filteredData.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...filteredData,
        name: filteredData.name?.trim(),
        updatedAt: new Date()
      }
    });

    return user;
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object} Updated user
   */
  static async changePassword(userId, currentPassword, newPassword) {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate current password
    const isValidPassword = await this.validatePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    return updatedUser;
  }

  /**
   * Delete user account
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  static async deleteAccount(userId) {
    // Delete user (cascade will handle favorites)
    await prisma.user.delete({
      where: { id: userId }
    });

    return true;
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Object} User statistics
   */
  static async getStatistics(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        _count: {
          select: { favorites: true }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      totalFavorites: user._count.favorites,
      recentFavorites: user.favorites,
      memberSince: user.createdAt,
      lastUpdated: user.updatedAt
    };
  }

  /**
   * Get user's public profile (safe data only)
   * @param {Object} user - User object
   * @returns {Object} Public user data
   */
  static getPublicProfile(user) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      favoritesCount: user._count?.favorites || 0
    };
  }
}

module.exports = User;
