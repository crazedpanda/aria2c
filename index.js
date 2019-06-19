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
        if (client.get(req.params.infoHash)) {
            console.log('Removed:', req.params.infoHash);
            client.remove(req.params.infoHash);
            res.status(200).send('Removed: ' + req.params.infoHash);
        } else {
            res.status(200).send('Torrent does not exist!');
        }
    } catch (err) {
        res.status(200).send('Error: ' + err.toString());
    }
});
///////////////////////////////
app.get('/stats/:infoHash', function(req, res) {
    try {
        var torrent = client.get(req.params.infoHash);
        if (torrent) {
            var stats = new Object();
            stats.downloaded = torrent.downloaded;
            stats.downloadSpeed = torrent.downloadSpeed;
            stats.progress = torrent.progress;
            stats.timeRemaining = torrent.timeRemaining;
            stats.numPeers = torrent.numPeers;
            stats.path = torrent.path;
            res.status(200).send(JSON.stringify(stats));
        } else {
            res.status(200).send('Torrent does not exist!');
        }
    } catch (err) {
        res.status(200).send('Error: ' + err.toString());
    }
});
///////////////////////////////
app.get('/stream/:infoHash', function(req, res, next) {
    try {
        var torrent = client.get(req.params.infoHash);
        if (torrent) {
            var file = getLargestFile(torrent);
            if (file) {
                var range = req.headers.range;
                if (range) {
                    var parts = range.replace(/bytes=/, "").split("-");
                    var start = parseInt(parts[0], 10);
                    var end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
                    var chunksize = (end - start) + 1;
                    var stream = file.createReadStream({ start: start, end: end });
                    var head = {
                        'Content-Range': `bytes ${start}-${end}/${file.length}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': 'video/mp4',
                    };
                    res.writeHead(206, head);
                    stream.pipe(res);
                } else {
                    var head = {
                        'Content-Length': file.length,
                        'Content-Type': 'video/mp4',
                    };
                    res.writeHead(200, head);
                    file.createReadStream({ start: start, end: file.length }).pipe(res);
                }
            } else {
                res.redirect('/stream/' + req.params.infoHash);
            }
        } else {
            var magnetURI = buildMagnetURI(req.params.infoHash);
            client.add(magnetURI);
            res.redirect('/stream/' + req.params.infoHash);
        }
    } catch (err) {
        res.status(200).send('Error: ' + err.toString());
    }
});
app.listen(process.env.PORT);
console.log('Running at Port ' + process.env.PORT + '!');
