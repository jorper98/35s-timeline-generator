# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application (Vite frontend + esbuild backend)
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV PORT=3141

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
# RUN npm ci --omit=dev
RUN npm ci --omit=dev --ignore-scripts

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for persistent storage
RUN mkdir -p /app/data/user/projects

# Expose the port the app runs on
EXPOSE 3141

# Start the application
CMD ["npm", "start"]
