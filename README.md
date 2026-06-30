# ExpenseSplit

ExpenseSplit is a comprehensive personal finance and shared expense management platform. It allows users to track their personal spending, organize trips, manage group expenses, and resolve debts seamlessly.

## Architecture

This project operates as a monolithic deployment. The Express.js backend serves both the REST API (`/api/v1/*`) and the static frontend SPA files (HTML, CSS, Vanilla JS) from the same origin. 

## Features
- **Personal Finance:** Track expenses, categorize spending, and visualize data via the dashboard.
- **Group Splitting:** Create groups, add participants via invite codes, and track shared balances.
- **Secure Authentication:** JWT-based access and refresh token rotation.
- **Role-Based Access Control:** Admin and User tiers. Admin users have access to platform-wide statistics and user management.
- **Media Uploads:** Upload profile avatars and expense receipts securely.

## Prerequisites
- Node.js (v18 or higher)
- MongoDB (v5 or higher)
- Docker (optional, for containerized deployments)

## Local Development Startup

1. **Install Dependencies**
   Run the following command at the root to install both backend and frontend dependencies:
   ```bash
   npm run install-all
   ```

2. **Configure Environment variables**
   Copy the `.env.example` file to `.env` inside the `backend` directory, and customize the variables.
   ```bash
   cp .env.example backend/.env
   ```

3. **Start the Application**
   ```bash
   npm start
   ```
   For development with hot-reloading:
   ```bash
   cd backend
   npm run dev
   ```

4. **Access the App**
   Navigate to [http://localhost:5000](http://localhost:5000)

## Docker Deployment

To run the entire stack (Application + MongoDB) via Docker:

```bash
docker-compose up -d --build
```
The application will be available at `http://localhost:5000`. 
Data uploaded (receipts/avatars) will be persisted in the `uploads-data` Docker volume.

## Production Deployment Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Generate strong, cryptographically secure keys for `JWT_SECRET` and `REFRESH_TOKEN_SECRET`.
- [ ] Set `CLIENT_URL` to your production domain name (e.g., `https://my-app.com`).
- [ ] Connect a secure, managed MongoDB cluster via `MONGODB_URI`.
- [ ] If deploying behind a reverse proxy (like Nginx), ensure `X-Forwarded-For` headers are passed to Express for accurate rate-limiting.

## Security Features
- **NoSQL Injection Protection:** All request payloads (`req.body`, `req.query`, `req.params`) are sanitized globally to strip `$` keys.
- **Rate Limiting:** `express-rate-limit` prevents brute force and DDoS attacks on the `/api` routes.
- **Helmet:** Secure HTTP headers and Content Security Policies (CSP) are enforced.
- **Ownership Validation:** The backend rigorously checks `userId` constraints on all Data CRUD operations.
