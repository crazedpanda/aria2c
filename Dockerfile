FROM alpine:latest

COPY /app /app

RUN set -ex \
    && apk update \
    && apk add nodejs npm

RUN adduser --disabled-password --home /app/nodejs ubuntu

RUN echo "ubuntu:ubuntu" | chpasswd

USER ubuntu
WORKDIR /app/nodejs

RUN npm install

CMD ["npm", "start"]