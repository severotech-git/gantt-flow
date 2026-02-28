# Use a Node.js 22 LTS image as the base image
FROM node:22-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml to leverage Docker cache for dependencies
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Set the MONGODB_URI environment variable (will be overridden by docker-compose)
ENV MONGODB_URI=mongodb://admin:secret@mygantt-mongodb:27017/mygantt?authSource=admin

# Command to run the application in development mode
CMD ["pnpm", "run", "dev"]
