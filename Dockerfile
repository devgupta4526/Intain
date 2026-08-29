FROM node:24-bookworm AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/data ./data
EXPOSE 4000
CMD ["node", "dist/server/index.js"]
