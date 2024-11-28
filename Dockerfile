# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json (or yarn.lock if using Yarn) into the container
COPY package*.json ./

# Install dependencies (npm install)
RUN npm install

# Copy the rest of the application files into the container
COPY . .

# Expose the application on port 5000
EXPOSE 5000

# Set the environment variable to tell the app what port to listen on
ENV PORT=5000

# Command to run the application
CMD ["npm", "run", "start"]
