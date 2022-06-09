FROM alpine:latest

RUN apk --update --no-cache add bash bash-completion build-base caddy chromium curl ffmpeg git nano nodejs npm supervisor wget

#RUN version=$(curl -Ls "https://github.com/jpillora/chisel/releases/latest" | grep "linux_amd64" | cut -d '/' -f 6 | cut -d 'v' -f 2); \
#    curl -Ls -o "chisel.gz" "https://github.com/jpillora/chisel/releases/download/v${version}/chisel_${version}_linux_amd64.gz"; \
#    gzip -d "./chisel.gz"; \
#    mv "chisel" "/bin/chisel"; \
#    chmod +x "/bin/chisel"

COPY /app /app

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN npm install

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
