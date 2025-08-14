# Use the official Apify Node.js base image
FROM apify/actor-node:20

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy source code
COPY . ./

# Install TypeScript compiler globally
RUN npm install -g typescript

# Install Playwright and browsers for direct scraping
RUN npx playwright install --with-deps chromium

# Build the TypeScript code using tsc directly
RUN npx tsc

# Run the actor
CMD npm start
