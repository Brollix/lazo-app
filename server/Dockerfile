# ===========================
# Stage 1: Build Stage
# ===========================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# ===========================
# Stage 2: Production Stage
# ===========================
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]

