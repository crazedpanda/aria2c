var express = require('express');
var fs = require('fs');
var path = require('path');
var cookieParser = require('cookie-parser')
var app = express();
var WebTorrent = require('webtorrent-hybrid');
var client = new WebTorrent();
var port = process.env.PORT ? process.env.PORT : 3000;
var buildMagnetURI = function(infoHash) {
	return 'magnet:?xt=urn:btih:' + infoHash + '&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Fopen.demonii.com%3A1337&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp://tracker.coppersurfer.tk/announce&tr=udp://tracker.coppersurfer.tk:6969&tr=udp://tracker.leechers-paradise.org:6969/announce&tr=udp://tracker.coppersurfer.tk:6969/announce&tr=udp://tracker.ilibr.org:6969/announce&tr=http://tracker.mininova.org/announce&tr=http://tracker.frostwire.com:6969/announce&tr=udp://tracker.openbittorrent.com:80';
};
var getFile = function(torrent, fileIndex) {
	var file = torrent.files[fileIndex];
	return file;
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
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use('/download', express.static('/tmp/webtorrent'));
///////////////////////////////
app.get('/', function(req, res) {
	res.send('Hello World!');
});
///////////////////////////////
app.get('/clear', function(req, res) {
	try {
		client.torrents.forEach(function(value, key) {
			console.log('Removed:', value.infoHash);
			client.remove(value.infoHash);
		});
		res.send('Removed all!');
	} catch (err) {
		res.send(err.toString());
	}
});
///////////////////////////////
app.get('/list', function(req, res) {
	try {
		var html = '<title>List</title>';
		client.torrents.forEach(function(value, key) {
			html += '<a href="/' + value.infoHash + '">' + value.infoHash + '</a><br>';
		});
		res.send(html);
	} catch (err) {
		res.send(err.toString());
	}
});
///////////////////////////////
app.get('/:infoHash', function(req, res) {
	try {
		var torrent = client.get(req.params.infoHash);
		if (torrent) {
			if (torrent.files.length) {
				var html = '<title>' + req.params.infoHash.toLowerCase() + '</title>';
				torrent.files.forEach(function(file, key) {
					html += '<table class="torrent" id="' + req.params.infoHash.toLowerCase() + '" style="table-layout:fixed;width:100%"><tr class="filepath"><td style="font-weight:bold;width:140px;vertical-align:middle">File Path:</td><td>' + file.path + '</td></tr><tr class="filesize"><td style="font-weight:bold;width:140px;vertical-align:middle">File Size:</td><td>' + file.length + ' bytes</td></tr><tr class="fileprogress"><td style="font-weight:bold;width:140px;vertical-align:middle">Download Progress:</td><td>' + Math.round(file.progress * 100) + '%</td></tr><tr class="buttons"><td></td><td><a href="/stream/' + req.params.infoHash.toLowerCase() + '/' + key + '">Stream</a>';
					if (file.progress == 1) {
						html += ' | <a href="/download/' + req.params.infoHash.toLowerCase() + '/' + file.path + '">Download</a>';
					}
					html += '</td></tr></table>';
					if (torrent.files.length - 1 != key) {
						html += '<hr>';
					}
				});
				res.send(html);
			} else {
				if (req.cookies.redirects) {
					if (parseInt(req.cookies.redirects) < 4) {
						res.cookie('redirects', parseInt(req.cookies.redirects) + 1);
					} else {
						res.clearCookie('redirects');
						if (client.get(req.params.infoHash)) {
							console.log('Removed:', req.params.infoHash);
							client.remove(req.params.infoHash);
						}
						throw new Error('No peers for ' + req.params.infoHash + '!');
					}
				} else {
					res.cookie('redirects', 1);
				}
				res.redirect('/' + req.params.infoHash);
			}
		} else {
			var magnetURI = buildMagnetURI(req.params.infoHash);
			client.add(magnetURI, function(torrent) {
				console.log('Added:', req.params.infoHash);
				res.redirect('/' + req.params.infoHash);
			});
		}
	} catch (err) {
		res.send(err.toString());
	}
});
///////////////////////////////
app.get('/remove/:infoHash', function(req, res) {
	try {
		if (client.get(req.params.infoHash)) {
			console.log('Removed:', req.params.infoHash);
			client.remove(req.params.infoHash);
			res.send('Removed: ' + req.params.infoHash);
		} else {
			res.send('Torrent does not exist!');
		}
	} catch (err) {
		res.send('Error: ' + err.toString());
	}
});
///////////////////////////////
app.get('/stream/:infoHash', function(req, res) {
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
				res.redirect('/stream/' + req.params.infoHash);
			}
		} else {
			var magnetURI = buildMagnetURI(req.params.infoHash);
			client.add(magnetURI, function(torrent) {
				console.log('Added:', req.params.infoHash);
				res.redirect('/stream/' + req.params.infoHash);
			});
		}
	} catch (err) {
		res.send('Error: ' + err.toString());
	}
});
///////////////////////////////
app.get('/stream/:infoHash/:fileIndex', function(req, res) {
	try {
		var torrent = client.get(req.params.infoHash);
		if (torrent) {
			var file = getFile(torrent, req.params.fileIndex);
			if (file) {
				var range = req.headers.range;
				if (range) {
					var parts = range.replace(/bytes=/, "").split("-");
					var start = parseInt(parts[0], 10);
					var end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
					var chunksize = (end - start) + 1;
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
				res.redirect('/stream/' + req.params.infoHash + '/' + req.params.fileIndex);
			}
		} else {
			var magnetURI = buildMagnetURI(req.params.infoHash);
			client.add(magnetURI, function(torrent) {
				console.log('Added:', req.params.infoHash);
				res.redirect('/stream/' + req.params.infoHash + '/' + req.params.fileIndex);
			});
		}
	} catch (err) {
		res.send('Error: ' + err.toString());
	}
});
app.listen(port, function() {
	console.log('Server is running at ' + port);
});
