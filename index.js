var express = require('express');
var app = express();
var WebTorrent = require('webtorrent');
var client = new WebTorrent();

app.use(express.static(__dirname + '/public'));

var buildMagnetURI = function(infoHash) {
    return 'magnet:?xt=urn:btih:' + infoHash + '&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp://tracker.coppersurfer.tk/announce&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969/announce&tr=udp://tracker.coppersurfer.tk:6969/announce&tr=udp://tracker.ilibr.org:6969/announce&tr=http://tracker.mininova.org/announce&tr=http://tracker.frostwire.com:6969/announce&tr=udp://tracker.openbittorrent.com:80';
};
var getLargestFile = function(torrent) {
    var file;
    for (var i = 0; i < torrent.files.length; i++) {
        if (!file || file.length < torrent.files[i].length) {
            file = torrent.files[i];
        }
    }
    return file;
};
///////////////////////////////
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});
///////////////////////////////
app.get('/clear', function(req, res) {
    try {
        client.torrents.forEach(function(value, key) {
            console.log('Removed:', value.infoHash);
            client.remove(value.infoHash);
        });
        res.status(200).send('Removed all!');
    } catch (err) {
        res.status(200).send(err.toString());
    }
});
///////////////////////////////
app.get('/list', function(req, res) {
    try {
        var list = [];
        client.torrents.forEach(function(value, key) {
            console.log('InfoHash #' + key, value.infoHash);
            list.push(value.infoHash);
        });
        res.status(200).send(JSON.stringify(list));
    } catch (err) {
        res.status(200).send(err.toString());
    }
});
///////////////////////////////
app.get('/add/:infoHash', function(req, res) {
    try {
        if (client.get(req.params.infoHash)) {
            res.status(200).send('Torrent exist!');
            return;
        } else {
            var magnetURI = buildMagnetURI(req.params.infoHash);
            client.add(magnetURI, function(torrent) {
                console.log('Downloading:', torrent.infoHash);
                torrent.files.forEach(function(file) {
                    console.log('Name:', file.name);
                })
                res.status(200).send('Added: ' + torrent.infoHash);
            });
        }
    } catch (err) {
        res.status(200).send(err.toString());
    }
});
///////////////////////////////
app.get('/remove/:infoHash', function(req, res) {
    try {
        console.log('Removed:', req.params.infoHash);
        client.remove(req.params.infoHash);
        res.status(200).send('Removed: ' + req.params.infoHash);
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});
///////////////////////////////
app.get('/stats/:infoHash', function(req, res) {
    try {
        var torrent = client.get(req.params.infoHash);
        var stats = new Object();
        stats.downloaded = torrent.downloaded
        stats.downloadSpeed = torrent.downloadSpeed
        stats.progress = torrent.progress
        stats.numPeers = torrent.numPeers

        res.status(200).send(JSON.stringify(stats));
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});
///////////////////////////////
app.get('/stream/:infoHash', function(req, res, next) {
    try {
        var torrent = client.get(req.params.infoHash);
        if (!torrent) {
            var magnetURI = buildMagnetURI(req.params.infoHash);
            client.add(magnetURI);
        }
        var file = getLargestFile(torrent);
        var total = file.length;
        if (typeof req.headers.range != 'undefined') {
            var range = req.headers.range;
            var parts = range.replace(/bytes=/, "").split("-");
            var partialstart = parts[0];
            var partialend = parts[1];
            var start = parseInt(partialstart, 10);
            var end = partialend ? parseInt(partialend, 10) : total - 1;
            var chunksize = (end - start) + 1;
            var test = total / 2;

        } else {
            var start = 0;
            var end = total;
        }
        var stream = file.createReadStream({ start: start, end: end });
        res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
        stream.pipe(res);
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});
///////////////////////////////
app.get('/download/:infoHash', function(req, res, next) {
    try {
        var torrent = client.get(req.params.infoHash);
        if (!torrent) {
            var magnetURI = buildMagnetURI(req.params.infoHash);
            client.add(magnetURI);
        }
        var file = getLargestFile(torrent);
        var head = {
            'Content-Length': file.length,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        file.createReadStream({ start: 0, end: file.length }).pipe(res);
    } catch (err) {
        res.status(500).send('Error: ' + err.toString());
    }
});
app.listen(process.env.PORT);
console.log('Running at Port ' + process.env.PORT + '!');
