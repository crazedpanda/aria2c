#! /bin/sh
sed -i -e 's/$PORT/'"$PORT"'/g' "Caddyfile"
cat Caddyfile
supervisord -c "supervisord.conf"
