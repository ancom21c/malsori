
ARG NEXT_PUBLIC_APP_VERSION="dev"
ARG BUILD_SHA="dev"
ARG VITE_API_BASE="/"
ARG VITE_ADMIN_API_BASE=""

FROM node:20-alpine AS build


ARG NEXT_PUBLIC_APP_VERSION
ARG BUILD_SHA
ARG VITE_API_BASE
ARG VITE_ADMIN_API_BASE

WORKDIR /app

ENV CI=1 \
    NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION} \
    BUILD_SHA=${BUILD_SHA} \
    VITE_APP_VERSION=${NEXT_PUBLIC_APP_VERSION} \
    VITE_API_BASE=${VITE_API_BASE} \
    VITE_ADMIN_API_BASE=${VITE_ADMIN_API_BASE}

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

RUN npm run build

FROM nginx:1.27-alpine

ARG BUILD_SHA
ENV BUILD_SHA=${BUILD_SHA}

RUN apk add --no-cache openssl

COPY nginx.http.conf /etc/nginx/malsori/http.conf
COPY nginx.https.conf /etc/nginx/malsori/https.conf
COPY --chmod=755 docker-entrypoint.d/40-configure-https.sh /docker-entrypoint.d/40-configure-https.sh
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
