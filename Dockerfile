# Runtime stage
FROM node:20-slim
WORKDIR /app

# Only install production dependencies (no typescript, no tsx)
COPY package*.json ./
RUN npm install --omit=dev 

# Copy ONLY the compiled folder
COPY --from=builder /app/dist ./dist

# Railway provides the PORT
ENV NODE_ENV=production

# Run the compiled javascript file
CMD ["node", "dist/server.js"]
