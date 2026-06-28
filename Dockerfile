# NestJS (REST). Builds to dist/ and runs it. NODE_ENV=development so TypeORM
# `synchronize` auto-creates the tables on boot (no migration step needed for
# this throwaway review database).
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main"]
