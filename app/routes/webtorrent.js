const express = require("express");
const router = express.Router();
const AbortController = require("abort-controller");
const axios = require("axios");
const crypto = require("crypto");
const FileType = require("file-type");
const fs = require("fs-extra");
const parseRange = require("range-parser");
const WebTorrent = require("webtorrent");
const WebSocket = require("ws");
const clients = {};
router.ws("/:infoHash", function(ws, req) {
	const infoHash = req.params.infoHash.toLowerCase();
	if (!(infoHash in clients)) {
		clients[infoHash] = new WebTorrent();
	}
	var torrent = clients[infoHash].get(infoHash);
	if (!torrent) {
		torrent = clients[infoHash].add(buildMagnetURI(infoHash));
	}
	updateStatus(ws, torrent);
	ws.on("close", function() {
		clients[infoHash].destroy();
		delete clients[infoHash];
	});
});
router.ws("/convert/:infoHash/:index?", async function(ws, req) {
	const infoHash = req.params.infoHash.toLowerCase();
	if (infoHash.length == 40) {
		if (!(infoHash in clients)) {
			clients[infoHash] = new WebTorrent();
		}
		var torrent = clients[infoHash].get(infoHash);
		if (!torrent) {
			torrent = clients[infoHash].add(buildMagnetURI(infoHash));
		}
		if (torrent.ready) {
			var index;
			if (req.params.index) {
				index = parseInt(req.params.index) - 1;
			} else {
				index = torrent.files.reduce(function(total, currentValue, currentIndex, arr) {
					return currentValue.length > arr[total].length ? currentIndex : total;
				}, 0);
			}
			if (torrent.files[index]) {
				const controller = new AbortController();
				const {
					signal
				} = controller;
				ws.on("close", function() {
					controller.abort();
				});
				await convertVideo(signal, "https://mipeerflix.herokuapp.com/" + infoHash + "/" + (index + 1));
				ws.send(JSON.stringify({
					"type": "message",
					"payload": "File converted!"
				}));
			}
		} else {
			ws.send(JSON.stringify({
				"type": "error",
				"payload": "Torrent is not ready!"
			}));
		}
	} else {
		ws.send(JSON.stringify({
			"type": "error",
			"payload": "Incorrect hash provided"
		}));
	}
});
router.get("/clear", function(req, res) {
	Object.keys(clients).forEach(function(infoHash) {
		clients[infoHash].destroy();
		delete clients[infoHash];
	});
	fs.emptyDir("/tmp/webtorrent/");
	res.send("<title>MiPeerFlix - Clear</title>Removed all!");
});
router.get("/files/:infoHash/:index?", async function(req, res) {
	const infoHash = req.params.infoHash.toLowerCase();
	if (infoHash.length == 40) {
		if (!(infoHash in clients)) {
			clients[infoHash] = new WebTorrent();
		}
		var torrent = clients[infoHash].get(infoHash);
		if (!torrent) {
			torrent = clients[infoHash].add(buildMagnetURI(infoHash));
		}
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
						file.createReadStream(ranges[0]).pipe(res);
					}
				} else {
					res.writeHead(200, header);
					file.createReadStream().pipe(res);
				}
			} else {
				res.sendStatus(404);
			}
		} else {
			setTimeout(function() {
				res.redirect("/files/" + infoHash + (req.params.index ? "/" + req.params.index : ""));
			}, 15000);
		}
	} else {
		res.sendStatus(404);
	}
});
router.get("/list", function(req, res) {
	res.set("cache-control", "no-store");
	var html = "<html><head><title>MiPeerFlix - List</title><meta http-equiv=\"refresh\" content=\"20\"></head><body>";
	if (Object.keys(clients).length) {
		html += "<table>" + Object.values(clients).map(function(client) {
			return "<tr><td>" + client.torrents[0].infoHash + "</td><td><a href =\"/" + client.torrents[0].infoHash + "\">" + (client.torrents[0].name ? client.torrents[0].name : client.torrents[0].infoHash) + "</a></td></tr>";
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

function convertVideo(signal, input) {
	return new Promise(async function(resolve, reject) {
		const startTime = Date.now();
		if (!await pingServers()) {
			return;
		}
		const servers = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
		const keyframes = await getKeyframes(signal, input);
		let index = 1;
		while (keyframes.length) {
			let openServer = servers.indexOf(1);
			if (openServer > -1) {
				servers[openServer] = 0;
				splitVideo(signal, openServer, input, crypto.randomBytes(20).toString("hex") + ".mp4", index, keyframes.shift(), keyframes[0]).then(function() {
					servers[openServer] = 1;
				});
				index++;
			} else {
				console.log("Waiting for open server!");
				await sleep(1000);
			}
		}
		await Promise.resolve().then(function() {
			resolve();
		});
		signal.addEventListener("abort", function() {
			reject();
		});
		console.log("Processing time:", (Date.now() - startTime) / 1000);
	});
}

function getKeyframes(signal, input) {
	return new Promise(async function(resolve, reject) {
		let keyframes = [];
		await runCommand(signal, 0, "ffprobe -loglevel error -skip_frame nokey -select_streams v:0 -show_entries frame=pkt_pts_time -of csv=print_section=0 '" + input + "'", function(data) {
			keyframes.push(data);
		});
		keyframes = Buffer.concat(keyframes).toString().split("\n").filter(function(el) {
			return el.length;
		});
		await Promise.resolve().then(function() {
			resolve(keyframes);
		});
		signal.addEventListener("abort", function() {
			reject();
		});
	});
}

function pingServers() {
	var promises = [];
	for (var i = 0; i < 10; i++) {
		promises.push(axios.get("http://w0rker" + i + ".herokuapp.com/ping").then(function(response) {
			return response.data;
		}));
	}
	return Promise.all(promises).then(function(data) {
		return true;
	}).catch(function() {
		return false;
	});
}

function runCommand(signal, server, command, stdout, stderr) {
	return new Promise(function(resolve, reject) {
		const ws = new WebSocket("wss://w0rker" + server + ".herokuapp.com/command");
		ws.on("open", function() {
			console.log("Connected");
			if (!signal.aborted) {
				ws.send(JSON.stringify({
					"type": "message",
					"payload": {
						"command": command
					}
				}));
			}
		});
		ws.on("message", function(string) {
			let json = JSON.parse(string);
			if (json.type == "stdout") {
				if (stdout) {
					stdout(Buffer.from(json.data));
				} else {
					console.log("stdout", Buffer.from(json.data).toString());
				}
			} else if (json.type == "stderr") {
				if (stderr) {
					stderr(Buffer.from(json.data));
				} else {
					console.log("stderr", Buffer.from(json.data).toString());
				}
			}
		});
		ws.on("error", function(err) {
			console.log("Error", err);
			reject();
		});
		ws.on("close", function() {
			console.log("Disconnected");
			if (signal.aborted) {
				reject();
			} else {
				resolve();
			}
		});
		signal.addEventListener("abort", function() {
			ws.close();
		});
	});
}

function splitVideo(signal, server, input, output, index, start, end) {
	return new Promise(async function(resolve, reject) {
		let command = "ffmpeg -threads 4 -loglevel error -ss " + (parseFloat(start) - 0.1) + " -i " + input + " -ss " + parseFloat(start);
		if (end) {
			command += " -to " + parseFloat(end);
		}
		command += " -c:v libx264 -vf scale=-2:1080:flags=fast_bilinear -c:a copy -tune zerolatency -avoid_negative_ts 1 " + output;
		await runCommand(signal, server, command);
		const outputFile = fs.createWriteStream(__dirname.replace("/routes", "") + "/public/OUTPUT_" + index.toString().padStart(4, "0") + ".mp4");
		await runCommand(signal, server, "cat " + output, function(data) {
			outputFile.write(data);
		});
		outputFile.end();
		await runCommand(signal, server, "rm " + output);
		await Promise.resolve().then(function() {
			resolve();
		});
		signal.addEventListener("abort", function() {
			reject();
		});
	});
}

function updateStatus(ws, torrent) {
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
	setTimeout(function() {
		if (status == "Downloaded") return;
		return updateStatus(ws, torrent);
	}, 1000);
}

function sleep(ms) {
	return new Promise(function(resolve) {
		setTimeout(resolve, ms);
	});
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
