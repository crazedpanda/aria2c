#! /bin/sh
sed -i -e 's/$PORT/'"$PORT"'/g' "Caddyfile"
echo "PORT: $PORT"
supervisord -c "supervisord.conf"
