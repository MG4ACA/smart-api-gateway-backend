# Smart API Gateway - Backend

A Node.js Express API Gateway for dynamic recipe fetching with user authentication and favorites management.

## Features

- 🔐 **JWT Authentication** - Secure user registration and login
- 🍳 **Recipe API Integration** - TheMealDB API integration with caching
- ⭐ **Favorites Management** - Save and manage favorite recipes
- 🗄️ **PostgreSQL Database** - Prisma ORM for data management
- 🧪 **Comprehensive Testing** - Jest and Supertest integration
- 🛡️ **Security Middleware** - Helmet, CORS, rate limiting
- 📊 **API Documentation** - RESTful API design

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Bcrypt
- **Testing**: Jest + Supertest
- **External APIs**: TheMealDB

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/smart_api_gateway"
   JWT_SECRET="your-super-secret-jwt-key"
   PORT=3000
   NODE_ENV="development"
   ```

4. **Setup database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   
   # Seed the database (optional)
   npm run db:seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Recipes
- `GET /api/recipes/categories` - Get recipe categories
- `GET /api/recipes/random` - Get random recipe
- `GET /api/recipes/search?q=term` - Search recipes
- `GET /api/recipes/category/:category` - Get recipes by category
- `GET /api/recipes/:id` - Get recipe details

### Favorites (Protected)
- `GET /api/favorites` - Get user's favorites
- `POST /api/favorites/:recipeId` - Add recipe to favorites
- `DELETE /api/favorites/:recipeId` - Remove from favorites
- `GET /api/favorites/:recipeId/check` - Check if recipe is favorited
- `GET /api/favorites/stats` - Get favorite statistics

### Health Check
- `GET /health` - Server health status

## Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  favorites Favorite[]
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  recipeId  String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  
  @@unique([userId, recipeId])
}

model Recipe {
  id          String   @id @default(cuid())
  externalId  String   @unique
  name        String
  category    String?
  instructions String?
  thumbnail   String?
  ingredients Json?
  cachedAt    DateTime @default(now())
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auth.test.js
```

## Development Scripts

```bash
# Start development server with auto-reload
npm run dev

# Generate Prisma client
npm run db:generate

# Create and apply database migration
npm run db:migrate

# Push schema changes to database
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database with test data
npm run db:seed
```

## Project Structure

```
backend/
├── prisma/              # Database schema and migrations
│   ├── schema.prisma
│   └── seed.js
├── controllers/         # Route handlers
│   ├── authController.js
│   ├── favoriteController.js
│   └── recipeController.js
├── middlewares/         # Custom middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── validation.js
├── routes/              # API routes
│   ├── auth.js
│   ├── favorites.js
│   └── recipes.js
├── services/            # Business logic
│   └── recipeService.js
├── tests/               # Test files
│   ├── auth.test.js
│   ├── favorites.test.js
│   └── recipes.test.js
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
└── server.js            # Application entry point
```

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt for secure password storage
- **Rate Limiting** - Prevent API abuse
- **CORS Protection** - Configured for specific frontend origins
- **Helmet** - Security headers middleware
- **Input Validation** - Comprehensive request validation
- **SQL Injection Protection** - Prisma ORM parameterized queries

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "details": ["Additional error details"]
}
```

## Caching Strategy

- **Recipe Caching** - External API responses cached in PostgreSQL
- **Cache Invalidation** - 24-hour TTL for recipe data
- **Fallback Mechanism** - Serve cached data if external API fails

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="secure-production-secret"
PORT=3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
FRONTEND_URL="https://your-frontend-domain.com"
```

### Docker Support (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details
