# Environment Variables Setup Guide

This guide explains how to set up environment variables for local development and production deployment.

## 🔑 Required Environment Variables

### Client (Frontend)

Create a `.env` file in the `client/` directory:

```env
# Google Maps API Key (Required for map features)
VITE_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
```

**How to get a Google Maps API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Create a new project or select an existing one
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key
6. **Important:** Restrict your API key:
   - Set HTTP referrers (your domain)
   - Restrict to only the APIs you need

### Server (Backend)

Environment variables are typically set in your hosting platform (Render, Heroku, etc.)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Supabase (if using)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# PDF Templates (optional)
LOA_TEMPLATE_URL=https://your-storage.com/loa_template.pdf
SCOPE_TEMPLATE_URL=https://your-storage.com/scope_template.pdf

# Other services
STRIPE_SECRET_KEY=sk_test_...
OPENAI_API_KEY=sk-...
```

---

## 📁 File Structure

```
project-root/
├── client/
│   ├── .env              ← Your local environment variables (git-ignored)
│   ├── .env.example      ← Template for other developers
│   └── src/
└── server/
    └── .env              ← Server environment variables (git-ignored)
```

---

## 🚀 Local Development Setup

### Step 1: Copy Example Files

```bash
# Client
cd client
cp .env.example .env

# Edit .env and add your actual API keys
```

### Step 2: Add Your API Keys

Edit `client/.env`:
```env
VITE_GOOGLE_MAPS_KEY=AIzaSyA7QSM-fqUn4grHM6OYddNgKzK7uMlBY1I
```

### Step 3: Restart Development Server

```bash
npm run dev
```

**Note:** Vite requires a restart to pick up new environment variables.

---

## 🌐 Production Deployment (Render)

### Client (Static Site)

1. Go to your Render dashboard
2. Select your static site
3. Go to "Environment" tab
4. Add environment variable:
   - Key: `VITE_GOOGLE_MAPS_KEY`
   - Value: `your_actual_api_key`
5. Trigger a new deploy

### Server (Web Service)

1. Go to your Render dashboard
2. Select your web service
3. Go to "Environment" tab
4. Add all required environment variables
5. Render will auto-deploy on changes

---

## ✅ Verification

### Check if Environment Variables are Loaded

**Client:**
```javascript
console.log('Google Maps Key:', import.meta.env.VITE_GOOGLE_MAPS_KEY ? '✅ Loaded' : '❌ Missing');
```

**Server:**
```javascript
console.log('Database URL:', process.env.DATABASE_URL ? '✅ Loaded' : '❌ Missing');
```

### Common Issues

**Problem:** "Missing VITE_GOOGLE_MAPS_KEY" error

**Solutions:**
1. Make sure `.env` file exists in `client/` directory
2. Restart your dev server (`npm run dev`)
3. Check that the variable starts with `VITE_` (required by Vite)
4. Verify no typos in the variable name

**Problem:** Environment variables work locally but not in production

**Solutions:**
1. Check Render environment variables are set correctly
2. Trigger a manual redeploy
3. Check build logs for errors
4. Verify variable names match exactly (case-sensitive)

---

## 🔒 Security Best Practices

### ✅ DO:
- ✅ Use `.env` files for local development
- ✅ Add `.env` to `.gitignore`
- ✅ Use environment variables for all secrets
- ✅ Restrict API keys to specific domains/IPs
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly

### ❌ DON'T:
- ❌ Commit `.env` files to git
- ❌ Hardcode API keys in source code
- ❌ Share API keys in public repositories
- ❌ Use production keys in development
- ❌ Leave API keys unrestricted

---

## 📝 Environment Variable Naming

### Vite (Client)
- Must start with `VITE_` to be exposed to client
- Example: `VITE_GOOGLE_MAPS_KEY`

### Node.js (Server)
- No prefix required
- Example: `DATABASE_URL`

---

## 🆘 Need Help?

If you're still having issues:

1. Check the console for specific error messages
2. Verify `.env` file location and syntax
3. Restart your development server
4. Check Render deployment logs
5. Verify API key is valid and not expired

---

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Google Maps API Documentation](https://developers.google.com/maps/documentation)
- [Render Environment Variables](https://render.com/docs/environment-variables)
