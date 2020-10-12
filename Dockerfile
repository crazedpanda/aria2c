FROM alpine:latest

COPY /app /app

RUN set -ex \
    && apk update \
    && apk add bash nodejs npm

RUN adduser --disabled-password --home /app/nodejs ubuntu

RUN echo "ubuntu:ubuntu" | chpasswd

RUN chmod +x /app/entrypoint.sh

USER ubuntu
WORKDIR /app/ubuntu

CMD ["/app/entrypoint.sh"]
