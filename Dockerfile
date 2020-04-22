FROM alpine:latest

COPY /app /app

RUN set -ex \
    && apk update \
    && apk add nodejs npm

WORKDIR /app/nodejs

CMD ["node", "/app/nodejs/server.js"]
