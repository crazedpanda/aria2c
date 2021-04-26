FROM alpine:latest

RUN apk --update --no-cache add caddy curl ffmpeg nano nodejs npm supervisor g++ make

RUN adduser --disabled-password --home /app ubuntu

RUN echo "ubuntu:ubuntu" | chpasswd

USER ubuntu

RUN version=$(curl -Ls "https://github.com/jpillora/chisel/releases/latest" | grep "linux_amd64" | cut -d '/' -f 6 | cut -d 'v' -f 2); \
    curl -Ls -o "chisel.gz" "https://github.com/jpillora/chisel/releases/download/v${version}/chisel_${version}_linux_amd64.gz"; \
    gzip -d "./chisel.gz"; \
    mv "chisel" "/bin/chisel"; \
    chmod +x "/bin/chisel"

COPY /app /app

WORKDIR /app

RUN npm install puppeteer && npm install

RUN npm i gritty -g

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]