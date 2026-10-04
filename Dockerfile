# Use a lightweight Node.js image
FROM node:24-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
