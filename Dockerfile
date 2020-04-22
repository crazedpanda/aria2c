FROM alpine:latest

COPY /app /app

RUN set -ex \
    && apk update \
    && apk add nodejs npm

WORKDIR /app

RUN npm install

CMD ["npm", "start"]