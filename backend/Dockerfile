FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Initialize DB if not exists (handled by server.js/database.js on start, but we need the file location writable)
# We will use a volume for persistence in compose

EXPOSE 3000
CMD ["node", "server.js"]
