FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY server/ ./server/
COPY client/ ./client/
COPY data/ ./data/
COPY scripts/ ./scripts/

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server/index.js"]
