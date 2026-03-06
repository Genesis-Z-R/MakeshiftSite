# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++

COPY package*.json ./
# Install all dependencies including devDependencies because we use tsx to run the server
RUN npm install

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/db.ts ./
COPY --from=builder /app/.env.example ./.env

# Create a directory for the database volume
RUN mkdir -p /data

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/campus_marketplace.db
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
