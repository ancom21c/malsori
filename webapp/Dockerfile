
ARG NEXT_PUBLIC_APP_VERSION="dev"
ARG BUILD_SHA="dev"

FROM node:20-alpine AS build


ARG NEXT_PUBLIC_APP_VERSION
ARG BUILD_SHA

WORKDIR /app

ENV CI=1 \
    NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION} \
    BUILD_SHA=${BUILD_SHA} \
    VITE_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

RUN npm run build

FROM nginx:1.27-alpine

ARG BUILD_SHA
ENV BUILD_SHA=${BUILD_SHA}

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
