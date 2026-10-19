FROM node:24-bookworm-slim AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY artifacts/zihin-matematik/package.json artifacts/zihin-matematik/package.json
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-spec/package.json lib/api-spec/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/db/package.json lib/db/package.json
COPY scripts/package.json scripts/package.json

RUN pnpm install --frozen-lockfile --filter @workspace/zihin-matematik...

COPY artifacts/zihin-matematik artifacts/zihin-matematik
COPY lib/api-client-react lib/api-client-react

ENV PORT=80
ENV BASE_PATH=/
ENV VITE_API_URL=https://vezinapi.rfqcollector.com
ENV VITE_FRONTEND_URL=https://vezin.rfqcollector.com
RUN pnpm --filter @workspace/zihin-matematik run build

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/artifacts/zihin-matematik/dist/public /usr/share/nginx/html

EXPOSE 80
