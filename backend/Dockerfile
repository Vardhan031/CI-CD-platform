# Use Node.js official image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package manifests first for caching
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose backend REST port
EXPOSE 5000

# Start Express server
CMD ["npm", "start"]
