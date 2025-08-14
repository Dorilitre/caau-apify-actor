# Use the official Apify Node.js base image
FROM apify/actor-node:18

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm@8
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY . ./

# Build the TypeScript code
RUN pnpm build

# Run the actor
CMD pnpm start
