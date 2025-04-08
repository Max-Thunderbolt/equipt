# Equipt

A modern project management application built with Vue.js and Firebase.

## Environment Setup

1. Copy `.env.example` to `.env` for local development or `.env.production` for production:
   ```bash
   cp .env.example .env
   ```

2. Update the environment variables in your new `.env` file:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `POSTGRES_DB_PASSWORD`: Your database password (if needed)

Note: Never commit `.env` or `.env.production` files to version control as they contain sensitive information.

## Project Structure

- `/src` - Vue.js source files
- `/public` - Static assets (copied to dist during build)
- `/dist` - Build output (generated)
- `.github/workflows` - GitHub Actions CI/CD

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

The project is configured to automatically deploy to Firebase Hosting when code is merged to the main branch. You can also deploy manually:

```bash
# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# Login to Firebase (first time only)
firebase login

# Deploy to Firebase
npm run deploy
``` 