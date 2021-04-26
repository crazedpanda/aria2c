FROM alpine:latest

RUN apk --update --no-cache add caddy curl ffmpeg nano nodejs npm supervisor g++ make

RUN version=$(curl -Ls "https://github.com/jpillora/chisel/releases/latest" | grep "linux_amd64" | cut -d '/' -f 6 | cut -d 'v' -f 2); \
    curl -Ls -o "chisel.gz" "https://github.com/jpillora/chisel/releases/download/v${version}/chisel_${version}_linux_amd64.gz"; \
    gzip -d "./chisel.gz"; \
    mv "chisel" "/bin/chisel"; \
    chmod +x "/bin/chisel"

COPY /app /app

WORKDIR /app

RUN curl -Ls -o "http-node.tar.gz" "https://github.com/feross/http-node/archive/refs/tags/v1.2.0.tar.gz"; \
    tar -xf "http-node.tar.gz" && mkdir -p "./node_modules" && mv "./http-node-1.2.0" "./node_modules/http-node" && rm "http-node.tar.gz"; \
    npm install gritty puppeteer && npm install;

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]