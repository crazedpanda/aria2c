FROM alpine:latest

RUN apk --update --no-cache add add caddy curl ffmpeg nano nodejs npm supervisor

RUN version=$(curl -Ls "https://github.com/jpillora/chisel/releases/latest" | grep "linux_amd64" | cut -d '/' -f 6 | cut -d 'v' -f 2); \
    curl -Ls -o "chisel.gz" "https://github.com/jpillora/chisel/releases/download/v${version}/chisel_${version}_linux_amd64.gz"; \
    gzip -d "./chisel.gz"; \
    mv "chisel" "/bin/chisel"; \
    chmod +x "/bin/chisel"

COPY /app /app

RUN chmod +x /app/entrypoint.sh

WORKDIR /app/ubuntu

CMD ["/app/entrypoint.sh"]