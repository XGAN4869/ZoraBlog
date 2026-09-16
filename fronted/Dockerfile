# 基础镜像 一个精简的 Alpine Linux 系统（有 sh、apk、基本目录结构） + Node.js 20 和 npm
# 
FROM node:24-alpine AS build 

WORKDIR /app

# 先复制依赖清单，使未改依赖时可以复用 Docker 构建缓存。
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
