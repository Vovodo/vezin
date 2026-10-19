FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY . .

RUN pnpm install --frozen-lockfile --filter @workspace/zihin-matematik...

ENV PORT=80
ENV BASE_PATH=/
ENV VITE_API_URL=https://vezinapi.rfqcollector.com
ENV VITE_FRONTEND_URL=https://vezin.rfqcollector.com
RUN pnpm --filter @workspace/zihin-matematik run build

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/zihin-matematik/dist/public /usr/share/nginx/html

EXPOSE 80
