var Promise = require('bluebird');
var cookieParser = require('cookie-parser');
var express = require('express');
var WebTorrent = require('webtorrent-hybrid');
var client = new WebTorrent();
var port = process.env.PORT ? process.env.PORT : 3000;
var buildMagnetURI = function(infoHash) {
	return 'magnet:?xt=urn:btih:' + infoHash + '&tr=http%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2710%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fretracker.lanta-net.ru%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.sbsub.com%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.nyap2p.com%3A8080%2Fannounce&tr=udp%3A%2F%2Fbt1.archive.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker3.itzmx.com%3A6961%2Fannounce&tr=udp%3A%2F%2Fbt2.archive.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker1.itzmx.com%3A8080%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%2Fannounce&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Ftracker.kicks-ass.net%3A80%2Fannounce';
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
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use('/download', express.static('/tmp/webtorrent'));
app.get('/', function(req, res) {
	res.send('<title>MiPeerFlix</title>Hello World!');
});
app.get('/clear', function(req, res) {
	var hashes = [];
	client.torrents.forEach(function(value) {
		hashes.push(value.infoHash);
    });
    Promise.map(hashes, function(hash) {
        return removeTorrent({ infoHash: hash });
    }, { concurrency: 1 }).then(function() {
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
	addTorrent(req.params).then(function(torrent) {
		if ('retry' in req.cookies) {
			res.clearCookie('retry');
		}
		var html = '<head>';
		if (!torrent.done) {
			html += '<meta http-equiv="refresh" content="20"/>';
		}
		html += '<title>MiPeerFlix - ' + torrent.infoHash.toLowerCase() + '</title><b>Menu:</b> <a href="/remove/' + torrent.infoHash + '">Remove</a> | <a href="/' + torrent.infoHash + '">Reload</a><br><b>Peers:</b> ' + torrent.numPeers + '<hr>';
		if (torrent.files.length) {
			torrent.files.forEach(function(file, key) {
				html += '<table class="torrent" id="' + torrent.infoHash.toLowerCase() + '" style="table-layout:fixed;width:100%"><tr class="filepath"><td style="font-weight:bold;width:140px;vertical-align:middle">File Path:</td><td>' + file.path + '</td></tr><tr class="filesize"><td style="font-weight:bold;width:140px;vertical-align:middle">File Size:</td><td>' + file.length + ' bytes</td></tr><tr class="fileprogress"><td style="font-weight:bold;width:140px;vertical-align:middle">Download Progress:</td><td>' + Math.floor(file.progress * 100) + '%</td></tr><tr class="buttons"><td></td><td><a href="/stream/' + torrent.infoHash.toLowerCase() + '/' + (key + 1) + '">Stream</a>';
				if (file.progress == 1) {
					html += ' | <a href="/download/' + torrent.infoHash.toLowerCase() + '/' + file.path + '">Download</a>';
				}
				html += '</td></tr></table>';
				if (torrent.files.length - 1 != key) {
					html += '<hr>';
				}
			});
		} else {
			html += 'Waiting for peers to load files!';
		}
		res.send(html);
	}, function() {
		if ('retry' in req.cookies) {
			removeTorrent(req.params);
			res.clearCookie('retry');
			res.send('<title>MiPeerFlix - Error</title>No peers found for torrent!');
		} else {
			console.log(req.params.infoHash, 'Retrying!');
			res.cookie('retry', 1);
			res.redirect('/' + req.params.infoHash);
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
	addTorrent(req.params).then(function(torrent) {
		if ('retry' in req.cookies) {
			res.clearCookie('retry');
		}
		if (torrent.files.length) {
			if (req.params.fileIndex) {
				var file = getFile(torrent, parseInt(req.params.fileIndex) - 1);
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
				res.send('<title>MiPeerFlix - Error</title>File does not exist!');
			}
		} else {
			res.send('<title>MiPeerFlix - Error</title>Waiting for peers to load files!');
		}
	}, function() {
		if ('retry' in req.cookies) {
			removeTorrent(req.params);
			res.clearCookie('retry');
			res.send('<title>MiPeerFlix - Error</title>No peers found for torrent!');
		} else {
			console.log(req.params.infoHash, 'Retrying!');
			res.cookie('retry', 1);
			if (req.params.fileIndex) {
				res.redirect('/stream/' + req.params.infoHash + '/' + req.params.fileIndex);
			} else {
				res.redirect('/stream/' + req.params.infoHash);
			}
		}
	});
});
app.listen(port, function() {
	console.log('Server is running at ' + port);
});

function addTorrent(arg) {
	var torrent = client.get(arg.infoHash);
	if (!torrent) {
		console.log(arg.infoHash, 'Adding torrent!');
		var magnetURI = buildMagnetURI(arg.infoHash);
		torrent = client.add(magnetURI);
	}
	return checkPeers(torrent, Math.floor(Date.now() / 1000));
}

function checkPeers(torrent, startTime) {
	if (torrent.ready) {
        return Promise.resolve(torrent);
	} else {
		if ((Math.floor(Date.now() / 1000) - startTime) < 15) {
			console.log(torrent.infoHash, 'Wait for torrent to load!');
			return Promise.delay(5000).then(function() {
				return checkPeers(torrent, startTime);
			});
		} else {
			console.log(torrent.infoHash, 'Waited too long for torrent to load!');
			return Promise.reject(torrent);
		}
	}
}

function removeTorrent(arg) {
    return new Promise(function (resolve, reject) {
        var torrent = client.get(arg.infoHash);
        if (torrent) {
            console.log(arg.infoHash, 'Removing torrent!');
            var magnetURI = buildMagnetURI(arg.infoHash);
            client.remove(magnetURI, function(err) {
                if (err) {
                    console.log(arg.infoHash, 'Error removing torrent!');
                    reject(arg);
                } else {
                    console.log(arg.infoHash, 'Torrent removed!');
                    resolve(arg);
                }
            });
        } else {
            console.log(arg.infoHash, 'Torrent does not exist!');
            resolve(arg);
        }
    });
}