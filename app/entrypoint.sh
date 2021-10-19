#! /bin/sh
npm rebuild
sed -i -e 's/$PORT/'"$PORT"'/g' "Caddyfile"
supervisord -c "supervisord.conf"
