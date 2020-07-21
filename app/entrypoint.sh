#! /bin/sh
set -ex
cd /app/nodejs
npm config set proxy http://138.68.240.218:8080
npm config set https-proxy http://138.68.240.218:8080
npm install
npm start