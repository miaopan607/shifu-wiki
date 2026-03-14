FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY index.js ./

ENV NODE_ENV=production
ENV PORT=3001
ENV CACHE_DIR=/app/data

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["npm", "start"]
