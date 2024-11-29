# Use an official Node.js runtime as a parent image
FROM node:18

# Install Supervisor
RUN apt-get update && apt-get install -y supervisor

#check if puppeteer is required
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true 

# Set the working directory
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create log directory for Supervisor
RUN mkdir -p /var/log/supervisord

# Copy Supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose the port the app runs on
EXPOSE 5000

# Command to run Supervisor
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# # Command to run the app
# CMD [ "node", "src/server.js" ]