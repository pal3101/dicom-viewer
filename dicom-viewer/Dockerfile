FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package.json ./server/
RUN cd server && npm install --production

# Copy compiled server output
COPY server/dist ./server/dist

# Copy pre-built web frontend
COPY web/dist ./web/dist

# Copy pre-built OHIF viewer
COPY ohif-viewer/dist ./ohif-viewer/dist

# CloudBase CloudRun injects PORT; default to 80 for local Docker
ENV PORT=80
EXPOSE 80

WORKDIR /app/server
CMD ["node", "dist/index.js"]
