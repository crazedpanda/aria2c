FROM alpine:latest

COPY /app /app

RUN set -ex \
    && apk update \
    && apk add curl ffmpeg nano nodejs npm supervisor

RUN grep -h
RUN cut -h
RUN tar -h
RUN mv -h
RUN gzip -h

RUN adduser --disabled-password --home /app/nodejs ubuntu

RUN echo "ubuntu:ubuntu" | chpasswd

RUN chmod +x /app/entrypoint.sh

USER ubuntu
WORKDIR /app/ubuntu

CMD ["/app/entrypoint.sh"]