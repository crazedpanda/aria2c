var Promise = require('bluebird');
var express = require('express');
var WebTorrent = require('webtorrent-hybrid');
var client = new WebTorrent();
var port = process.env.PORT ? process.env.PORT : 3000;
var buildMagnetURI = function(infoHash) {
	return 'magnet:?xt=urn:btih:' + infoHash + '&tr=http%3A%2F%2F9.rarbg.com%3A2710%2Fannounce&tr=http%3A%2F%2Fannounce.opensharing.org%3A2710%2Fannounce&tr=http%3A%2F%2Fannounce.torrentsmd.com%3A6969%2Fannounce&tr=http%3A%2F%2Fbt.careland.com.cn%3A6969%2Fannounce&tr=http%3A%2F%2Fbttrack.9you.com%2Fannounce&tr=http%3A%2F%2Fi.bandito.org%2Fannounce&tr=http%3A%2F%2Fmgtracker.org%3A2710%2Fannounce&tr=http%3A%2F%2Fopen.acgtracker.com%3A1096%2Fannounce&tr=http%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=http%3A%2F%2Fopen.demonii.com%3A6969%2Fannounce&tr=http%3A%2F%2Fopen.nyaatorrents.info%3A6544%2Fannounce&tr=http%3A%2F%2Fopensharing.org%3A2710%2Fannounce&tr=http%3A%2F%2Fpubt.net%3A2710%2Fannounce&tr=http%3A%2F%2Fretracker.telecom.kz%3A80%2Fannounce&tr=http%3A%2F%2Ftracker4.infohash.org%3A80%2Fannounce&tr=http%3A%2F%2Ftracker4.infohash.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.ccc.de%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.dutchtracking.com%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.dutchtracking.nl%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.ex.ua%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.frostwire.com%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.kicks-ass.net%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.leechers-paradise.org%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.mininova.org%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.publicbt.com%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.pubt.net%3A2710%2Fannounce&tr=http%3A%2F%2Ftracker.tfile.me%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.x4w.co%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.com%3A80%2Fannounce&tr=udp%3A%2F%2F9.rarbg.com%3A2710%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2710%2Fannounce&tr=udp%3A%2F%2Fannounce.opensharing.org%3A2710%2Fannounce&tr=udp%3A%2F%2Fbt.careland.com.cn%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A80%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fmgtracker.org%3A2710%2Fannounce&tr=udp%3A%2F%2Fopen.acgtracker.com%3A1096%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.nyaatorrents.info%3A6544%2Fannounce&tr=udp%3A%2F%2Fopensharing.org%3A2710%2Fannounce&tr=udp%3A%2F%2Fpubt.net%3A2710%2Fannounce&tr=udp%3A%2F%2Fretracker.telecom.kz%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker4.infohash.org%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker4.infohash.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.blackunicorn.xyz%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.btzoo.eu%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.dutchtracking.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.dutchtracking.nl%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.ex.ua%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.ilibr.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Ftracker.kicks-ass.net%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.publicbt.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.pubt.net%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.x4w.co%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce';
};
var getFile = function(torrent, fileIndex) {
	return torrent.files[fileIndex];
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
var app = express();
app.use(express.static(__dirname + '/public'));
app.use('/download', express.static('/tmp/webtorrent'));
app.get('/', function(req, res) {
	res.send('<title>MiPeerFlix</title>Hello World!');
});
app.get('/clear', function(req, res) {
    var promises = [];
    client.torrents.forEach(function(value) {
        promises.push(removeTorrent(value));
    });
    Promise.all(promises).then(function() {
        res.send('<title>MiPeerFlix - Clear</title>Removed all!');
    }).catch(function(err) {
        res.send('<title>MiPeerFlix - Error</title>' + err.toString());
    });
});
app.get('/favicon.ico', function(req, res) {
	res.redirect('https://webtorrent.io/favicon-32x32.png');
});
app.get('/list', function(req, res) {
	var html = '<title>MiPeerFlix - List</title>';
	client.torrents.forEach(function(value, key) {
		html += '<a href="/' + value.infoHash + '">' + value.infoHash + '</a><br>';
	});
	res.send(html);
});
app.get('/:infoHash', function(req, res) {
    addTorrent(req.params).then(checkPeers).then(function(arg) {
	    var torrent = client.get(arg.infoHash);
        var html = '<head>';
        if (torrent.progress < 1) {
            html += '<meta http-equiv="refresh" content="15"/>';
        }
        html += '<title>MiPeerFlix - ' + arg.infoHash.toLowerCase() + '</title><b>Torrent Menu:</b> <a href="/remove/' + arg.infoHash + '">Remove</a> | <a href="/' + arg.infoHash + '">Reload</a><br><b>Number of Peers:</b> ' + torrent.numPeers + '<hr>';
        torrent.files.forEach(function(file, key) {
            html += '<table class="torrent" id="' + arg.infoHash.toLowerCase() + '" style="table-layout:fixed;width:100%"><tr class="filepath"><td style="font-weight:bold;width:140px;vertical-align:middle">File Path:</td><td>' + file.path + '</td></tr><tr class="filesize"><td style="font-weight:bold;width:140px;vertical-align:middle">File Size:</td><td>' + file.length + ' bytes</td></tr><tr class="fileprogress"><td style="font-weight:bold;width:140px;vertical-align:middle">Download Progress:</td><td>' + Math.floor(file.progress * 100) + '%</td></tr><tr class="buttons"><td></td><td><a href="/stream/' + arg.infoHash.toLowerCase() + '/' + (key + 1) + '">Stream</a>';
            if (file.progress == 1) {
                html += ' | <a href="/download/' + arg.infoHash.toLowerCase() + '/' + file.path + '">Download</a>';
            }
            html += '</td></tr></table>';
            if (torrent.files.length - 1 != key) {
                html += '<hr>';
            }
        });
        res.send(html);
    }, function(arg) {
	    var torrent = client.get(arg.infoHash);
        if (torrent.numPeers == 0) {
            res.send('No peers for ' + req.params.infoHash + '!');
        } else {
            res.redirect('/' + arg.infoHash);
        }        
    });
});
app.get('/remove/:infoHash', function(req, res) {
    removeTorrent(req.params).then(function(arg) {
		res.send('<title>MiPeerFlix - Remove</title>Removed: ' + arg.infoHash);
    }, function() {
        res.send('<title>MiPeerFlix - Remove</title>Error removing torrent!');
    });
});
app.get('/stream/:infoHash/:fileIndex?', function(req, res) {
    addTorrent(req.params).then(checkPeers).then(function(arg) {
	    var torrent = client.get(arg.infoHash);
        if ('fileIndex' in arg) {
            var file = getFile(torrent, parseInt(arg.fileIndex) - 1);
        } else {
            var file = getLargestFile(torrent);
        }
        if (file) {
            var range = req.headers.range;
            if (range) {
                var parts = range.replace(/bytes=/, "").split("-");
                var start = parseInt(parts[0], 10);
                var end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
                var chunksize = end - start + 1;
                var stream = file.createReadStream({
                    start: start,
                    end: end
                });
                var head = {
                    'Content-Range': `bytes ${start}-${end}/${file.length}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4',
                };
                res.writeHead(206, head);
                stream.pipe(res);
            } else {
                file.createReadStream({
                    start: 0,
                    end: file.length
                }).pipe(res);
            }
        } else {
            console.log(arg.infoHash, 'File does not exist!');
        }
    }, function(arg) {
	    var torrent = client.get(arg.infoHash);
        if (torrent.numPeers == 0) {
            res.send('No peers for ' + arg.infoHash + '!');
        } else {
            var redirectURL = '/stream/' + arg.infoHash;
            if ('fileIndex' in arg && arg.fileIndex) {
                redirectURL += '/' + arg.fileIndex;
            }
            res.redirect(redirectURL);
        }        
    });
});
app.listen(port, function() {
	console.log('Server is running at ' + port);
});

function checkPeers(arg) {
    return new Promise(function (resolve, reject) {
        console.log(arg.infoHash, 'Checking peers!');
        var torrent = client.get(arg.infoHash);
	    if (torrent) {
            if (torrent.numPeers == 0) {
                Promise.delay(15000).then(function() {
                    if (torrent.numPeers == 0) {
                        console.log(arg.infoHash, 'Torrent has no peers!');
                        reject(arg);
                    } else {
                        console.log(arg.infoHash, 'Torrent has ' + torrent.numPeers + ' peers!');
                        resolve(arg);
                    }
                });
            } else {
                console.log(arg.infoHash, 'Torrent has ' + torrent.numPeers + ' peers!');
                resolve(arg);
            }
        } else {
            console.log(arg.infoHash, 'Torrent is not running in client!');
            reject(arg);
        }
    });
}

function checkTorrent(arg) {
    return new Promise(function (resolve, reject) {
        console.log(arg.infoHash, 'Checking torrent!');
        var torrent = client.get(arg.infoHash);
	    if (torrent) {
            console.log(arg.infoHash, 'Torrent is running in client!');
            resolve(arg);
        } else {
            console.log(arg.infoHash, 'Torrent is not running in client!');
            reject(arg);
        }
    });
}

function addTorrent(arg) {
    return checkTorrent(arg).then(function(arg) {
        console.log(arg.infoHash, 'Torrent is already added!');
        return arg;
    }, function(arg) {
        console.log(arg.infoHash, 'Adding torrent!');
        var magnetURI = buildMagnetURI(arg.infoHash);
        client.add(magnetURI);
        return Promise.delay(5000).then(function() {
            return arg;
        });
    }).then(checkTorrent).then(function(arg) {
        return arg;
    }, function(arg) {
        console.log(arg.infoHash, 'Error adding torrent!');
        return Promise.reject(arg);
    });
}

function removeTorrent(arg) {
    return checkTorrent(arg).then(function(arg) {
        console.log(arg.infoHash, 'Removing torrent!');
        var magnetURI = buildMagnetURI(arg.infoHash);
        client.remove(magnetURI);
        return Promise.delay(5000).then(function() {
            return checkTorrent(arg).then(function(arg) {
                console.log(arg.infoHash, 'Error removing torrent!');
                return Promise.reject(arg);
            }, function(arg) {
                console.log(arg.infoHash, 'Torrent removed!');
                return arg;
            });
        });
    }, function(arg) {
        console.log(arg.infoHash, 'Torrent is already removed!');
        return arg;
    });
}