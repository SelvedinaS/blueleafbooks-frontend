BlueLeafBooks - Production Deploy Notes (Render)

Backend (Render Web Service):
- Root Directory: backend
- Build Command: npm install
- Start Command: npm start
- Environment variables (set in Render, NOT in code):
  MONGODB_URI=...
  JWT_SECRET=...
  SPACES_BUCKET=...
  SPACES_REGION=nyc3
  SPACES_KEY=...
  SPACES_SECRET=...
  PAYPAL_CLIENT_ID=...
  PAYPAL_CLIENT_SECRET=...
  PAYPAL_MODE=live   (or sandbox for testing)
  PLATFORM_FEE_PERCENTAGE=10
  ADMIN_EMAIL=blueleafbooks@hotmail.com
  ADMIN_PASSWORD=...

  # Forgot password (sends reset link via email)
  EMAIL_HOST=smtp-mail.outlook.com
  EMAIL_PORT=587
  EMAIL_USER=blueleafbooks@hotmail.com
  EMAIL_PASS=your-password-or-app-password
  EMAIL_FROM=blueleafbooks@hotmail.com
  FRONTEND_BASE_URL=https://your-frontend-url.netlify.app

Frontend:
- This is a static HTML/CSS/JS frontend in /frontend
- Update API_BASE_URL in frontend/js/api.js to your Render backend URL:
  https://<your-backend>.onrender.com/api

Recommended:
- Use Render Static Site (or Netlify) for /frontend
- Or host /frontend on GitHub Pages (if CORS is configured on backend)

Security:
- Do NOT upload .env to GitHub.
- Keep keys only in Render Environment settings.
