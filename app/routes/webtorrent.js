const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const FileType = require("file-type");
const fs = require("fs-extra");
const parseRange = require("range-parser");
const promisify = require("util").promisify
const sleep = promisify(setTimeout);
const WebTorrent = require("webtorrent");
var client = new WebTorrent({
	maxConns: 10,
	tracker: false,
	dht: false,
	lsd: false, //Doesn't work on Heroku!
	webSeeds: true,
	utp: false,
	uploadLimit: 1000000
});
var lastUpdated = {};
router.ws("/:infoHash", function(ws, req) {
	const infoHash = req.params.infoHash.toLowerCase();
	var torrent = getTorrent(infoHash);
	updateStatus(ws, torrent).catch(function(err) {
		console.log("updateStatus", err.toString());
		ws.close();
	});
});
router.get("/clear", function(req, res) {
	client.destroy();
	client = new WebTorrent();
	fs.emptyDir("/tmp/webtorrent/");
	res.send("<title>MiPeerFlix - Clear</title>Removed all!");
});
router.get("/download/:infoHash/:index?", async function(req, res) {
	const infoHash = req.params.infoHash.toLowerCase();
	if (infoHash.length == 40) {
		var torrent = getTorrent(infoHash);
		if (torrent.ready) {
			var index;
			if (req.params.index) {
				index = parseInt(req.params.index) - 1;
			} else {
				index = torrent.files.reduce(function(total, currentValue, currentIndex, arr) {
					return currentValue.length > arr[total].length ? currentIndex : total;
				}, 0);
			}
			file = torrent.files[index];
			if (file) {
				res.redirect("/files/" + infoHash + "/" + file.path);
			} else {
				res.sendStatus(404);
			}
		} else {
			await sleep(15000);
			res.redirect("/download/" + infoHash + (req.params.index ? "/" + req.params.index : ""));
		}
	} else {
		res.sendStatus(404);
	}
});
router.get("/stream/:infoHash/:index?", async function(req, res) {
	const infoHash = req.params.infoHash.toLowerCase();
	if (infoHash.length == 40) {
		var torrent = getTorrent(infoHash);
		if (torrent.ready) {
			var index;
			if (req.params.index) {
				index = parseInt(req.params.index) - 1;
			} else {
				index = torrent.files.reduce(function(total, currentValue, currentIndex, arr) {
					return currentValue.length > arr[total].length ? currentIndex : total;
				}, 0);
			}
			file = torrent.files[index];
			if (file) {
				var header = {
					"Content-Disposition": `filename="` + encodeURI(file.name) + `"`,
					"Content-Length": file.length,
					"Content-Type": "application/octet-stream"
				};
				var contenttype = await FileType.fromStream(file.createReadStream({
					start: 0,
					end: 256
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
						const readable = file.createReadStream(ranges[0]);
						readable.pipe(res);
						readable.on("data", function() {
							lastUpdated[infoHash] = Date.now();
						});
					}
				} else {
					res.writeHead(200, header);
					const readable = file.createReadStream();
					readable.pipe(res);
					readable.on("data", function() {
						lastUpdated[infoHash] = Date.now();
					});
				}
			} else {
				res.sendStatus(404);
			}
		} else {
			await sleep(15000);
			res.redirect("/stream/" + infoHash + (req.params.index ? "/" + req.params.index : ""));
		}
	} else {
		res.sendStatus(404);
	}
});
router.get("/remove/:infoHash", function(req, res) {
	const infoHash = req.params.infoHash.toLowerCase();
	if (infoHash.length == 40) {
		var torrent = client.get(infoHash);
		if (torrent) {
			delete lastUpdated[infoHash];
			torrent.destroy();
			fs.remove("/tmp/webtorrent/" + infoHash);
		}
		res.send("Removed!");
	} else {
		res.send("Page does not exist!");
	}
});
router.get("/list", function(req, res) {
	res.set("cache-control", "no-store");
	var html = "<html><head><title>MiPeerFlix - List</title><meta http-equiv=\"refresh\" content=\"20\"></head><body>";
	if (client.torrents.length) {
		const currentTimestamp = Date.now();
		html += "<table>" + client.torrents.map(function(torrent) {
			return "<tr><td>" + torrent.infoHash + "</td><td><a href =\"/" + torrent.infoHash + "\">" + (torrent.name ? torrent.name : torrent.infoHash) + "</a></td><td><a href =\"/remove/" + torrent.infoHash + "\">Remove</a></td><td>" + Math.round((currentTimestamp - lastUpdated[torrent.infoHash]) / 1000) + " seconds ago</td></tr>";
		}).join("") + "</table>";
	} else {
		html += "No torrents in client!";
	}
	html += "</body></html>";
	res.send(html);
});
router.get("/:infoHash", function(req, res) {
	if (req.params.infoHash.length == 40) {
		res.set("cache-control", "no-store");
		res.sendFile(__dirname.replace("/routes", "") + "/public/torrent.html");
	} else {
		res.send("Page does not exist!");
	}
});
exports.routes = router;

function getTorrent(infoHash) {
	var torrent = client.get(infoHash);
	if (!torrent) {
		torrent = client.add(buildMagnetURI(infoHash));
	}
	lastUpdated[infoHash] = Date.now();
	return torrent;
}

async function updateStatus(ws, torrent) {
	if (!ws) return;
	if (ws.readyState !== 1) return;
	const status = torrent.done ? torrent.progress == 1 ? "Downloaded" : "Stopped" : torrent.name && torrent.progress > 0 ? "Downloading" : "Getting metadata";
	ws.send(JSON.stringify({
		"type": "message",
		"payload": {
			status: status,
			infoHash: torrent.infoHash,
			name: torrent.name,
			numPeers: torrent.numPeers,
			speed: prettyBytes(torrent.downloadSpeed) + "/s",
			timeRemaining: parseInt(torrent.timeRemaining),
			readableTimeRemaining: humanTime(torrent.timeRemaining),
			files: torrent.files.map(function(file) {
				return {
					name: file.name,
					path: file.path,
					downloaded: prettyBytes(file.downloaded),
					total: prettyBytes(file.length),
					progress: parseInt(file.progress * 100)
				};
			})
		}
	}));
	lastUpdated[torrent.infoHash] = Date.now();
	if (status == "Downloaded") {
		await sleep(60000);
	} else {
		await sleep(1000);
	}
	return updateStatus(ws, torrent);
}

function buildMagnetURI(infoHash) {
	return "magnet:?xt=urn:btih:" + infoHash + "&tr=http%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2710%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fretracker.lanta-net.ru%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.sbsub.com%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.nyap2p.com%3A8080%2Fannounce&tr=udp%3A%2F%2Fbt1.archive.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker3.itzmx.com%3A6961%2Fannounce&tr=udp%3A%2F%2Fbt2.archive.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker1.itzmx.com%3A8080%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%2Fannounce&tr=udp%3A%2F%2Ftracker.istole.it%3A80&tr=udp%3A%2F%2Ftracker.kicks-ass.net%3A80%2Fannounce";
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
