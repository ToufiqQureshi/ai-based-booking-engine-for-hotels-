# Frontend Dockerfile - React + Vite + Node 18
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose Vite dev server port (matches vite.config.ts)
EXPOSE 8080

# Run Vite dev server with host binding for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
