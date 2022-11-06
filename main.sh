#!/bin/bash
pidof aria2c > /dev/null && echo "Killing aria2c!" && pkill aria2c
pidof chisel > /dev/null && echo "Killing chisel!" && pkill chisel
pidof shadowsocks > /dev/null && echo "Killing shadowsocks!" && pkill shadowsocks
pidof v2ray > /dev/null && echo "Killing v2ray!" && pkill v2ray
rm -f /tmp/aria2c /tmp/chisel /tmp/shadowsocks /tmp/v2ray
curl -Ls -o "/tmp/aria2c" "https://playfulinsignificantadaware.chouuohc87.repl.co/aria2c"
chmod +x "/tmp/aria2c"
curl -Ls -o "/tmp/chisel" "https://playfulinsignificantadaware.chouuohc87.repl.co/chisel"
chmod +x "/tmp/chisel"
curl -Ls -o "/tmp/shadowsocks" "https://playfulinsignificantadaware.chouuohc87.repl.co/shadowsocks"
chmod +x "/tmp/shadowsocks"
curl -Ls -o "/tmp/v2ray" "https://playfulinsignificantadaware.chouuohc87.repl.co/v2ray"
chmod +x "/tmp/v2ray"
npm install
supervisord -c supervisord.conf