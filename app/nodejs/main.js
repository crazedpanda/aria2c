var Promise = require("bluebird");
var bodyParser = require("body-parser");
var execAsync = Promise.promisify(require("child_process").exec);
var compression = require("compression");
var express = require("express");
var FileType = require("file-type");
var fs = require("fs-extra");
var WebTorrent = require("webtorrent");

var torrent = new Torrent();

var app = express();
app.use(express.static(__dirname + '/public'));
app.use(compression());
app.use(bodyParser.json());

app.get("/", function(req, res) {
	res.send("<title>MiPeerFlix</title>Hello World!");
});

app.post("/command", function(req, res) {
	runCmd(req.body.command).then(function(arg) {
		res.send(arg);
	}).catch(function(err) {
		res.send(err);
	});
});

app.get("/add/:infoHash", function(req, res) {
	var link = req.params.infoHash.toLowerCase();
	if (link.length == 40) {
		try {
			torrent.add(link, function() {
				res.send({
					error: false,
					message: torrent.get(link)
				});
			});
		} catch (e) {
			res.send({
				error: true,
				message: e.message
			});
		}
	} else {
		res.send({
			error: true,
			message: "Incorrect hash provided"
		});
	}
});

app.get("/clear", function(req, res) {
	var infoHashes = Object.keys(torrent.list());
	infoHashes.forEach(function(infoHash) {
		torrent.remove(infoHash);
	});
	res.send("<title>MiPeerFlix - Clear</title>Removed all!");
});

app.get("/download/:infoHash/:index?", async function(req, res) {
	var link = req.params.infoHash.toLowerCase();
	if (link.length == 40) {
		try {
			if (req.params.fileIndex) {
				torrent.getFile(link, parseInt(req.params.fileIndex) - 1, function(result) {
					return serveFile(req, res, result);
				});
			} else {
				torrent.getLargestFile(link, function(result) {
					return serveFile(req, res, result);
				});
			}
		} catch (e) {
			res.send({
				error: true,
				message: e.message
			});
		}
	} else {
		res.send({
			error: true,
			message: "Incorrect hash provided"
		});
	}
});

app.get("/favicon.ico", function(req, res) {
	res.redirect("https://webtorrent.io/favicon-32x32.png");
});

app.get("/list", function(req, res) {
	var html = "<title>MiPeerFlix - List</title><table>";
	var list = Object.entries(torrent.list());
	for (var i = 0; i < list.length; i++) {
		html += "<tr><td>" + list[i][1] + "</td><td><a href =\"/" + list[i][0] + "\">" + list[i][0] + "</a></td></tr>";
	}
	html += "</table>"
	res.send(html);
});

app.get("/remove/:infoHash", function(req, res) {
	var link = req.params.infoHash.toLowerCase();
	if (link.length == 40) {
		try {
			res.send({
				error: torrent.remove(link)
			});
		} catch (e) {
			res.send({
				error: true,
				message: e.message
			});
		}
	} else {
		res.send({
			error: true,
			message: "Incorrect hash provided"
		});
	}
});

app.get("/status/:infoHash", function(req, res) {
	var link = req.params.infoHash.toLowerCase();
	if (link.length == 40) {
		try {
			var data = torrent.get(link);
			if (data) {
				res.send({
					error: false,
					message: torrent.get(link)
				});
			} else {
				res.send({
					error: true,
					message: "Torrent is not loaded"
				});
			}
		} catch (e) {
			res.send({
				error: true,
				message: e.message
			});
		}
	} else {
		res.send({
			error: true,
			message: "Incorrect hash provided"
		});
	}
});

app.get("/stream/:infoHash/:index?", async function(req, res) {
	var link = req.params.infoHash.toLowerCase();
	if (link.length == 40) {
		try {
			if (req.params.fileIndex) {
				torrent.getFile(link, parseInt(req.params.fileIndex) - 1, function(result) {
					return streamFile(req, res, result);
				});
			} else {
				torrent.getLargestFile(link, function(result) {
					return streamFile(req, res, result);
				});
			}
		} catch (e) {
			res.send({
				error: true,
				message: e.message
			});
		}
	} else {
		res.send({
			error: true,
			message: "Incorrect hash provided"
		});
	}
});

app.get("/:infoHash", async function(req, res) {
	res.sendFile(__dirname + "/public/torrent.html");
});

app.listen(process.env.PORT || 3000);

function streamFile(req, res, result) {
	var file = result.file;
	var contenttype = result.contenttype;
    console.log("contenttype", result.contenttype);
	var range = req.headers.range;
	if (range) {
		var parts = range.replace(/bytes=/, "").split("-");
		var start = parseInt(parts[0], 10);
		var end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
		var chunksize = end - start + 1;
		var head = {
			"Content-Range": "bytes " + start + "-" + end + "/" + file.length,
			"Accept-Ranges": "bytes",
			"Content-Length": chunksize,
			"Content-Type": contenttype
		};
		res.writeHead(206, head);
		file.createReadStream({
			start: start,
			end: end
		}).pipe(res);
	} else {
		file.createReadStream({
			start: 0,
			end: file.length
		}).pipe(res);
	}
}

function serveFile(req, res, result) {
    var file = result.file;
	var contenttype = result.contenttype;
    console.log("contenttype", result.contenttype);
	var head = {
		"Content-Disposition": "filename=" + file.name,
		"Content-Type": contenttype
	};
	res.writeHead(200, head);
	file.createReadStream({
		start: 0,
		end: file.length
	}).pipe(res);
}

function buildMagnetURI(infoHash) {
	return "magnet:?xt=urn:btih:" + infoHash + "&tr=http%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2710%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fretracker.lanta-net.ru%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.sbsub.com%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.nyap2p.com%3A8080%2Fannounce&tr=udp%3A%2F%2Fbt1.archive.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker3.itzmx.com%3A6961%2Fannounce&tr=udp%3A%2F%2Fbt2.archive.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker1.itzmx.com%3A8080%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%2Fannounce&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Ftracker.kicks-ass.net%3A80%2Fannounce";
}

function runCmd(cmd) {
	return execAsync(cmd).then(function(stdout) {
		console.log(cmd, "Success!");
		return stdout;
	}).catch(function(err) {
		console.log(cmd, "Failed!");
		return Promise.reject(err);
	});
}

function Torrent(client) {
	var _this = this;
	this.client = new WebTorrent();
	this.statusLoader = function(torrent) {
		var files = [];
		for (var i = 0; i < torrent.files.length; i++) {
			files.push({
				name: torrent.files[i].name,
				path: torrent.files[i].path,
				downloaded: prettyBytes(torrent.files[i].downloaded),
				total: prettyBytes(torrent.files[i].length),
				progress: parseInt(torrent.files[i].progress * 100)
			});
		}
		return {
			status: torrent.done ? torrent.progress == 1 ? "Downloaded" : "Stopped" : torrent.name && torrent.progress > 0 ? "Downloading" : "Getting metadata",
			infoHash: torrent.infoHash,
			name: torrent.name,
			numPeers: torrent.numPeers,
			speed: prettyBytes(torrent.downloadSpeed) + "/s",
			timeRemaining: parseInt(torrent.timeRemaining),
			readableTimeRemaining: humanTime(torrent.timeRemaining),
			files: files
		};
	};
	this.add = function(infoHash, callback) {
		var torrent = _this.client.get(infoHash);
		if (torrent) {
			// torrent.deselect(0, torrent.pieces.length - 1, false);
			if (callback) callback(torrent);
		} else {
			_this.client.add(buildMagnetURI(infoHash), function(torrent) {
				// Check to see if `file.deselect()` is working
				// torrent.files.forEach(function(file, index, arr) {
				// 	file.deselect();
				// });
				// torrent.deselect(0, torrent.pieces.length - 1, false);
				if (callback) callback(torrent);
			});
		}
	};
	this.remove = function(infoHash) {
		var torrent = _this.client.get(infoHash);
		if (torrent) {
			torrent.destroy();
			fs.remove("/tmp/webtorrent/" + infoHash);
		}
		return false;
	};
	this.list = function() {
		var torrents = {};
		for (var i = 0; i < _this.client.torrents.length; i++) {
			torrents[_this.client.torrents[i].infoHash] = _this.client.torrents[i].name;
		}
		return torrents;
	};
	this.get = function(infoHash) {
		var torr = _this.client.get(infoHash);
		return torr ? _this.statusLoader(torr) : null;
	};
	this.getFile = function(infoHash, fileIndex, callback) {
		_this.add(infoHash, async function(torrent) {
			var stream = torrent.files[fileIndex].createReadStream({
				start: 0,
				end: 512
			});
			var contenttype = await FileType.fromStream(stream);
			if (callback) callback({
				file: torrent.files[fileIndex],
				contenttype: contenttype.mime
			});
		});
	};
	this.getLargestFile = function(infoHash, callback) {
		_this.add(infoHash, async function(torrent) {
			var file;
			for (var i = 0; i < torrent.files.length; i++) {
				if (!file || file.length < torrent.files[i].length) {
					file = torrent.files[i];
				}
			}
			var stream = file.createReadStream({
				start: 0,
				end: 512
			});
			var contenttype = await FileType.fromStream(stream);
			if (callback) callback({
				file: file,
				contenttype: contenttype.mime
			});
		});
	};
}

function prettyBytes(num) {
	var exponent,
		unit,
		neg = num < 0,
		units = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	if (neg) num = -num;
	if (num < 1) return (neg ? "-" : "") + num + " B";
	exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1);
	num = Number((num / Math.pow(1000, exponent)).toFixed(2));
	unit = units[exponent];
	return (neg ? "-" : "") + num + " " + unit;
}

function humanTime(ms) {
	var seconds = ms / 1000;
	var result = "";
	var days = Math.floor(seconds % 31536000 / 86400);
	if (days > 0) result += "".concat(days, "d ");
	var hours = Math.floor(seconds % 31536000 % 86400 / 3600);
	if (hours > 0) result += "".concat(hours, "h ");
	var minutes = Math.floor(seconds % 31536000 % 86400 % 3600 / 60);
	if (minutes > 0) result += "".concat(minutes, "m ");
	seconds = (seconds % 31536000 % 86400 % 3600 % 60).toFixed(0);
	if (seconds > 0) result += "".concat(seconds, "s");
	if (result === "") result += "0s";
	return result;
}