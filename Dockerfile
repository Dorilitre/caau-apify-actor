# Use the official Apify Node.js base image
FROM apify/actor-node:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . ./

# Install TypeScript and build tools
RUN npm install -g typescript tsup

# Build the TypeScript code
RUN npm run build

# Run the actor
CMD npm start
