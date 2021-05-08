const util = require("util");
const spawn = require("child_process").spawn;
const compression = require("compression");
const cors = require("cors");
const express = require("express")
const FileType = require("file-type");
const fs = require("fs-extra");
const parseRange = require("range-parser");
const WebTorrent = require("webtorrent");
const app = express();
var client = new WebTorrent();
var torrent = new Torrent(client);
app.use(cors());
app.use(compression());
app.use(express.urlencoded({
	"extended": true,
	"limit": "50mb"
}));
app.use(express.static(__dirname + "/public"));
app.use("/files", express.static("/tmp/webtorrent"));
app.get("/", function(req, res) {
	if ("HEROKU_APP_NAME" in process.env) {
		res.send("<title>MiPeerFlix</title>Hello World from " + process.env.HEROKU_APP_NAME + "!");
	} else {
		res.send("<title>MiPeerFlix</title>Hello World!");
	}
});
app.get("/ping", function(req, res) {
	res.send("OK");
});
app.get("/terminal", function(req, res) {
	res.sendFile(__dirname + "/public/gritty/gritty.html");
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
app.get("/check/:infoHash/:index?", function(req, res) {
	var link = req.params.infoHash.toLowerCase();
	if (link.length == 40) {
		if (req.params.index) {
			torrent.getFile(link, parseInt(req.params.index) - 1, async function(file) {
				if (await fs.pathExists("/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + ".done")) {
					res.redirect("/files/" + req.params.infoHash + "/" + file.path + ".m3u8");
				} else {
					res.send("<head><meta http-equiv=\"refresh\" content=\"20\"></head>Converting \"" + file.path + "\"");
				}
			});
		} else {
			torrent.getLargestFile(link, async function(file) {
				if (await fs.pathExists("/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + ".done")) {
					res.redirect("/files/" + req.params.infoHash + "/" + file.path + ".m3u8");
				} else {
					res.send("<head><meta http-equiv=\"refresh\" content=\"20\"></head>Converting \"" + file.path + "\"");
				}
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
app.get("/convert/:infoHash/:index?", function(req, res) {
	var link = req.params.infoHash.toLowerCase();
	if (link.length == 40) {
		if (req.params.index) {
			torrent.getFile(link, parseInt(req.params.index) - 1, function(file) {
				return convertFile(req, res, file);
			});
		} else {
			torrent.getLargestFile(link, function(file) {
				return convertFile(req, res, file);
			});
		}
	} else {
		res.send({
			error: true,
			message: "Incorrect hash provided"
		});
	}
});
app.get("/download/:infoHash/:index?", function(req, res) {
	var link = req.params.infoHash.toLowerCase();
	if (link.length == 40) {
		if (req.params.index) {
			torrent.getFile(link, parseInt(req.params.index) - 1, function(file) {
				return serveFile(req, res, file);
			});
		} else {
			torrent.getLargestFile(link, function(file) {
				return serveFile(req, res, file);
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
app.get("/torrent.js", function(req, res) {
	res.sendFile(__dirname + "/public/torrent.js");
});
app.get("/torrent.css", function(req, res) {
	res.sendFile(__dirname + "/public/torrent.css");
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
app.get("/stream/:infoHash/:index?", function(req, res) {
	var link = req.params.infoHash.toLowerCase();
	if (link.length == 40) {
		if (req.params.index) {
			torrent.getFile(link, parseInt(req.params.index) - 1, function(file) {
				return serveFile(req, res, file);
			});
		} else {
			torrent.getLargestFile(link, function(file) {
				return serveFile(req, res, file);
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
	if (req.params.infoHash.length == 40) {
		res.sendFile(__dirname + "/public/torrent.html");
	} else {
		res.send("Page does not exist!");
	}
});
app.listen(3000, function() {
	console.log("Server is running at 3000");
});
const io = require("socket.io")(1337);
const gritty = require("gritty");
gritty.listen(io);

function exec(cmd, limit) {
	return new Promise(async function(resolve, reject) {
		let response = "";
		let child = spawn(cmd, {
			shell: true
		});
		if (typeof limit == "number" && limit > 0) {
			var pid = (await exec("pidof ffmpeg")).trim();
			await exec("cpulimit -i -p " + pid + " -l " + limit);
		}
// 		child.stdout.pipe(fs.createWriteStream("/dev/stdout", {
// 			flags: "a"
// 		}));
		child.stdout.on("data", function(data) {
			response += data;
		});
// 		child.stderr.pipe(fs.createWriteStream("/dev/stderr", {
// 			flags: "a"
// 		}));
		child.stderr.on("data", function(data) {
			response += data;
		});
		child.on("close", function(code) {
			if (code === 0) {
				resolve(response);
			} else {
				reject(response);
			}
		});
	});
}

function convertFile(req, res, file) {
	return exec("ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + "\"").then(function(vcodec) {
		if (vcodec.trim() == "h264") {
			exec("ffmpeg -i \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + "\" -c copy -start_number 0 -hls_time 10 -hls_list_size 0 -f hls \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + ".m3u8\" && touch \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + ".done\"");
		} else {
			exec("ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=noprint_wrappers=1:nokey=1 \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + "\"").then(function(height) {
				if (parseInt(height.trim()) > 2160) {
					return exec("ffmpeg -threads 2 -i \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + "\" -c:v mpeg2video -qscale:v 2 -vf \"scale=-2:1080:flags=lanczos\" -c:a copy \"/tmp/" + req.params.infoHash + ".mkv\" && ffmpeg -threads 2 -i \"/tmp/" + req.params.infoHash + ".mkv\" -c:v libx264 -c:a copy -start_number 0 -hls_time 10 -hls_list_size 0 -f hls \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + ".m3u8\" && touch \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + ".done\"", req.query.limit && req.query.limit.length ? parseInt(req.query.limit) : 0);
				} else {
					return exec("ffmpeg -i \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + "\" -c:v copy -c:a copy -start_number 0 -hls_time 10 -hls_list_size 0 -f hls \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + ".m3u8\" && touch \"/tmp/webtorrent/" + req.params.infoHash + "/" + file.path + ".done\"");
				}
			});
		}
		if (req.params.index) {
			res.redirect("/check/" + req.params.infoHash + "/" + req.params.index);
		} else {
			res.redirect("/check/" + req.params.infoHash);
		}
	}).catch(function() {
		res.send("FFMPEG error!");
	});
}
async function serveFile(req, res, file) {
	var header = {
		"Content-Disposition": `filename="` + encodeURI(file.name) + `"`,
		"Content-Length": file.length,
		"Content-Type": "application/octet-stream"
	};
	var contenttype = await FileType.fromStream(file.createReadStream({
		start: 0,
		end: 512
	}));
	if (contenttype && "mime" in contenttype) {
		header["Content-Type"] = contenttype.mime;
	}
	var range = req.headers.range;
	if (range) {
		header["Accept-Ranges"] = "bytes";
		var ranges = parseRange(file.length, range, {
			combine: true
		});
		if (ranges === -1) {
			res.writeHead(416, header);
			res.end();
		} else if (ranges === -2 || ranges.type !== "bytes" || ranges.length > 1) {
			res.writeHead(400, header);
			res.end();
		} else {
			header["Content-Length"] = 1 + ranges[0].end - ranges[0].start;
			header["Content-Range"] = `bytes ${ranges[0].start}-${ranges[0].end}/${file.length}`;
			res.writeHead(206, header);
			file.createReadStream(ranges[0]).pipe(res);
		}
	} else {
		res.writeHead(200, header);
		file.createReadStream().pipe(res);
	}
}

function buildMagnetURI(infoHash) {
	return "magnet:?xt=urn:btih:" + infoHash + "&tr=http%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2710%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fretracker.lanta-net.ru%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.sbsub.com%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.nyap2p.com%3A8080%2Fannounce&tr=udp%3A%2F%2Fbt1.archive.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker3.itzmx.com%3A6961%2Fannounce&tr=udp%3A%2F%2Fbt2.archive.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker1.itzmx.com%3A8080%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%2Fannounce&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Ftracker.kicks-ass.net%3A80%2Fannounce";
}

function Torrent(client) {
	var _this = this;
	this.client = client;
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
		_this.add(infoHash, function(torrent) {
			var file = torrent.files[fileIndex];
			if (callback) callback(file);
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
			if (callback) callback(file);
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
