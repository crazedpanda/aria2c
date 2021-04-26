FROM alpine:latest

RUN apk --update --no-cache add caddy curl ffmpeg nano nodejs npm supervisor bash

RUN version=$(curl -Ls "https://github.com/jpillora/chisel/releases/latest" | grep "linux_amd64" | cut -d '/' -f 6 | cut -d 'v' -f 2); \
    curl -Ls -o "chisel.gz" "https://github.com/jpillora/chisel/releases/download/v${version}/chisel_${version}_linux_amd64.gz"; \
    gzip -d "./chisel.gz"; \
    mv "chisel" "/bin/chisel"; \
    chmod +x "/bin/chisel"

RUN adduser --disabled-password --home /app ubuntu

RUN echo "ubuntu:ubuntu" | chpasswd

RUN chown -R ubuntu:ubuntu /app

COPY /app /app

WORKDIR /app

RUN chmod +x /app/entrypoint.sh

RUN npm install

USER ubuntu

CMD ["/app/entrypoint.sh"]