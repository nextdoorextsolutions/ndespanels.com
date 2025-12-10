# Google Maps API Key Setup Guide

## Two-Key Security Architecture

For proper security and API restrictions, use **two separate API keys**:

### Key 1: Frontend (Browser/Client-Side)
**Name:** `Frontend - Maps JavaScript`  
**Key:** `AIzaSyD9aUoEaPhMZGbEwU8KPajIu3zxPHI3uQE`

**Application Restrictions:**
- Type: HTTP referrers
- Allowed referrers:
  - `https://www.ndespanels.com/*`
  - `https://ndespanels-com.vercel.app/*`
  - `http://localhost:*`

**API Restrictions:**
- ☑ Maps JavaScript API
- ☑ Maps Static API
- ☑ Places API
- ☑ Street View Static API

---

### Key 2: Backend (Server-Side)
**Name:** `Backend - Solar API`  
**Key:** Create a NEW key in Google Cloud Console

**Application Restrictions:**
- Type: None (or IP addresses if you know your Render server IPs)

**API Restrictions:**
- ☑ Solar API
- ☑ Geocoding API

---

## Environment Variable Setup

### Local Development

Create/update `.env` file in project root:

```bash
# Frontend Google Maps API Key (Browser-side)
VITE_GOOGLE_MAPS_KEY=AIzaSyD9aUoEaPhMZGbEwU8KPajIu3zxPHI3uQE

# Backend Google Maps API Key (Server-side)
GOOGLE_MAPS_API_KEY=YOUR_BACKEND_KEY_HERE
```

### Vercel (Frontend Deployment)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   VITE_GOOGLE_MAPS_KEY=AIzaSyD9aUoEaPhMZGbEwU8KPajIu3zxPHI3uQE
   ```

### Render (Backend Deployment)

1. Go to Render Dashboard → Your Service → Environment
2. Add:
   ```
   GOOGLE_MAPS_API_KEY=YOUR_BACKEND_KEY_HERE
   ```

---

## Code Usage

### Frontend
- **File:** `client/src/components/GoogleMapsLoader.tsx`
- **Variable:** `VITE_GOOGLE_MAPS_KEY`
- **Used for:** Loading Google Maps in browser

### Backend
- **File:** `server/lib/solarApi.ts`
- **Variable:** `GOOGLE_MAPS_API_KEY`
- **Used for:** Solar API and Geocoding API calls

---

## Security Best Practices

1. ✅ **Never commit `.env` files** - Already in `.gitignore`
2. ✅ **Use HTTP referrer restrictions** for frontend key
3. ✅ **Use separate keys** for frontend/backend
4. ✅ **Enable only required APIs** for each key
5. ⚠️ **Create the backend key** - Currently using placeholder

---

## Next Steps

1. **Create Backend Key:**
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Create new API key
   - Name it "Backend - Solar API"
   - Add restrictions (Solar API + Geocoding API)
   - Copy the key

2. **Update Local `.env`:**
   - Replace `YOUR_BACKEND_KEY_HERE` with your new backend key

3. **Update Render Environment:**
   - Add `GOOGLE_MAPS_API_KEY` with your backend key

4. **Restart Services:**
   - Restart local dev server
   - Redeploy on Render/Vercel if needed
