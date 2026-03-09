# Stage 1: Build Stage (Naming it 'build-env' to be safe)
FROM node:20-slim AS build-env
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Runtime Stage
FROM node:20-slim
WORKDIR /app

# Only install production dependencies
COPY package*.json ./
RUN npm install --omit=dev 

# Copy ONLY the compiled folder from the 'build-env' stage
COPY --from=build-env /app/dist ./dist

# Railway provides the PORT at runtime
ENV NODE_ENV=production

# Run the compiled javascript file
CMD ["node", "dist/server.js"]
