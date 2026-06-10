# InvestPro Documentation

## 🚀 Overview
InvestPro is a professional-grade React application designed for scalability and cross-platform deployment. It features a robust role-based navigation system, Redux-driven state management, and is ready for PWA or Native Mobile export.

### Core Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Motion/React, Recharts.
- **State**: Redux Toolkit.
- **Backend**: Express.js (Node.js) with Vite Middleware.
- **Mobile**: Capacitor (iOS/Android Support).
- **Deployment**: Docker-ready, PWA-ready.

---

## 🛠️ Build and Deployment Instructions

### 1. Website Build
To build the web application for production:
```bash
npm run build
```
The output will be in the `dist/` directory.

### 2. Mobile App Build (Capacitor)
To export the application to Native Mobile:

**Initialize Platforms** (First time only):
```bash
npx cap add android
npx cap add ios
```

**Sync Changes**:
Run this every time you update your web code:
```bash
npm run build
npx cap sync
```

**Open in IDE**:
```bash
npm run cap:open:android  # Opens Android Studio
npm run cap:open:ios      # Opens Xcode
```

### 3. PWA Export
Application is pre-configured for PWA. The `dist/` folder contains the necessary manifest and assets. Ensure you serve it over HTTPS to enable PWA features.

---

## 🐋 Docker Implementation
To run the application in a containerized environment, create a `Dockerfile` in the root:

```dockerfile
# Use Node.js LTS
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Final Stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t investpro .
docker run -p 3000:3000 investpro
```

---

## 🏗️ CI/CD Pipeline (GitHub Actions)
Create `.github/workflows/deploy.yml` to automate deployments:

```yaml
name: Deploy InvestPro

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Cloud
        # Add your deployment logic here (e.g., Vercel, Netlify, or Cloud Run)
        run: echo "Deploying to production server..."
```

---

## 🔐 Role-Based Access Control (RBAC)
The application handles three primary roles:
1. **Admin**: Full access to the Admin Panel, User Management, and Settings.
2. **User**: Standard dashboard access, profile management, and settings.
3. **Guest**: Restricted viewing access (Dashboard and Profile).

Role logic is managed in `src/App.tsx` using the `ProtectedRoute` component and validated against the Redux `auth` state.

---

## 🧪 Testing
The project is configured for testing with Jest and React Testing Library.

Run tests:
```bash
npm test
```

Example Unit Test (`App.test.tsx`):
```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page by default', () => {
  render(<App />);
  const linkElement = screen.getByText(/InvestPro/i);
  expect(linkElement).toBeInTheDocument();
});
```
