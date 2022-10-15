#! /bin/sh
sed -i -e 's/$PORT/'"$PORT"'/g' "Caddyfile"
echo "PORT: $PORT"
mkdir /tmp/webtorrent
supervisord -c "supervisord.conf"
