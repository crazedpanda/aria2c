#! /bin/sh
npm install puppeteer && npm update
sed -i -e 's/$PORT/'"$PORT"'/g' "Caddyfile"
supervisord -c "supervisord.conf"