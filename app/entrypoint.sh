#! /bin/sh
npm install
sed -i -e 's/$PORT/'"$PORT"'/g' "Caddyfile"
supervisord -c "supervisord.conf"
