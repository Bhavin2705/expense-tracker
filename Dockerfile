# Base node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy backend package files
COPY backend/package.json backend/package-lock.json ./backend/

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Install dependencies in root, backend, and frontend
RUN npm run install-all

# Copy remaining source code
COPY backend ./backend
COPY frontend ./frontend

# Create uploads directory
RUN mkdir -p /app/backend/uploads/avatars /app/backend/uploads/receipts

# Expose backend port
EXPOSE 5000

# Start backend server
CMD ["npm", "start"]
