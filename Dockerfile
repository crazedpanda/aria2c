FROM alpine:latest

COPY /app /app

RUN set -ex \
    && apk update \
    && apk add nodejs npm

RUN adduser --disabled-password --home /app ubuntu

RUN echo "ubuntu:ubuntu" | chpasswd

USER ubuntu
WORKDIR /app

RUN npm install

CMD ["npm", "start"]