#! /bin/sh
set -ex
cd /app/nodejs
npm install bluebird
npm install body-parser
npm install compression
npm install express
npm install file-type
npm install fs-extra
npm install webtorrent
npm start