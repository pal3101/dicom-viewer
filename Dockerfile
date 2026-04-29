FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --production

# Copy server source (runs with tsx)
COPY server/src ./server/src
COPY server/tsconfig.json ./server/

# Copy pre-built web frontend
COPY web/dist ./web/dist

# Copy pre-built OHIF viewer
COPY ohif-viewer/dist ./ohif-viewer/dist

# Install tsx globally for running TypeScript
RUN npm install -g tsx

ENV PORT=80
EXPOSE 80

WORKDIR /app/server
CMD ["tsx", "src/index.ts"]
