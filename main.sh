#!/bin/bash
pidof aria2c > /dev/null && echo "Killing aria2c!" && pkill aria2c
pidof caddy > /dev/null && echo "Killing caddy!" && pkill caddy
pidof chisel > /dev/null && echo "Killing chisel!" && pkill chisel
pidof shadowsocks > /dev/null && echo "Killing shadowsocks!" && pkill shadowsocks
pidof supervisord > /dev/null && echo "Killing supervisord!" && pkill supervisord
pidof v2ray > /dev/null && echo "Killing v2ray!" && pkill v2ray
rm -f /tmp/aria2c /tmp/caddy /tmp/chisel /tmp/shadowsocks /tmp/supervisord /tmp/v2ray
curl -Ls -o "/tmp/aria2c" "https://playfulinsignificantadaware.chouuohc87.repl.co/aria2c"
chmod +x "/tmp/aria2c"
curl -Ls -o "/tmp/caddy" "https://playfulinsignificantadaware.chouuohc87.repl.co/caddy"
chmod +x "/tmp/caddy"
curl -Ls -o "/tmp/chisel" "https://playfulinsignificantadaware.chouuohc87.repl.co/chisel"
chmod +x "/tmp/chisel"
curl -Ls -o "/tmp/ffmpeg" "https://playfulinsignificantadaware.chouuohc87.repl.co/ffmpeg"
chmod +x "/tmp/ffmpeg"
curl -Ls -o "/tmp/ffprobe" "https://playfulinsignificantadaware.chouuohc87.repl.co/ffprobe"
chmod +x "/tmp/ffprobe"
curl -Ls -o "/tmp/shadowsocks" "https://playfulinsignificantadaware.chouuohc87.repl.co/shadowsocks"
chmod +x "/tmp/shadowsocks"
curl -Ls -o "/tmp/supervisord" "https://playfulinsignificantadaware.chouuohc87.repl.co/supervisord"
chmod +x "/tmp/supervisord"
curl -Ls -o "/tmp/v2ray" "https://playfulinsignificantadaware.chouuohc87.repl.co/v2ray"
chmod +x "/tmp/v2ray"
npm update
/tmp/supervisord -c supervisord.conf