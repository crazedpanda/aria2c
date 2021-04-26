FROM alpine:latest

COPY /app /app

RUN set -ex \
    && apk update \
    && apk add ffmpeg nano nodejs npm supervisor

RUN whereis curl
RUN whereis grep
RUN whereis cut
RUN whereis tar
RUN whereis mv
RUN whereis gzip

RUN adduser --disabled-password --home /app/nodejs ubuntu

RUN echo "ubuntu:ubuntu" | chpasswd

RUN chmod +x /app/entrypoint.sh

USER ubuntu
WORKDIR /app/ubuntu

CMD ["/app/entrypoint.sh"]