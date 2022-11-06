const cors = require("cors");
const compression = require("compression");
const express = require("express");
const fs = require("fs");
const http = require("http");
const pty = require("node-pty");
const rangeParser = require("range-parser");
const stream = require("stream");
const streamSignature = require("stream-signature");
const WebTorrent = require("webtorrent");
const WebSocket = require("ws");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.WebSocketServer({
	noServer: true,
	path: "/terminal"
});
server.on("upgrade", function(request, socket, head) {
	wss.handleUpgrade(request, socket, head, function(ws) {
		wss.emit("connection", ws, request);
	});
});
wss.on("connection", function(ws) {
	const term = pty.spawn("bash", [], {
		name: "xterm-color",
		cols: 30,
		rows: 80,
		cwd: process.env.HOME,
		env: process.env
	});
	console.log(`Created terminal with PID: ${ term.pid }`);
	term.on("data", function(data) {
		if (ws.readyState === ws.OPEN) {
			ws.send(JSON.stringify({
				type: "data",
				payload: data
			}));
		}
	});
	term.on("exit", function() {
		if (ws.readyState === ws.OPEN) {
			ws.send(JSON.stringify({
				type: "exit"
			}));
			ws.close();
		}
	});
	ws.on("message", function(message) {
		try {
			var data = JSON.parse(message);
			if (data.type === "data") {
				term.write(data.payload);
			} else if (data.type === "resize") {
				const cols = data.payload.cols || 80;
				const rows = data.payload.rows || 30;
				term.resize(cols, rows);
				console.log(`Resized terminal ${ term.pid } to ${ cols } cols and ${ rows } rows`);
			}
		} catch (err) {
			console.log("ws.onmessage", err);
		}
	});
	ws.on("close", function() {
		term.kill();
		console.log(`Closed terminal with PID: ${ term.pid }`);
	});
});
const client = new WebTorrent({
	tracker: true,
	dht: true,
	lsd: false,
	webSeeds: false,
	utp: false,
	downloadLimit: -1,
	uploadLimit: 5000
});
app.use(compression());
app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use("/download", express.static("/tmp/webtorrent"));
app.get("/", function(_, res) {
	res.send("Hello world!");
});
app.get("/favicon.ico", function(_, res) {
	let img = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAz1BMVEVMaXHyM0z2M0zuM0z3M0z3M0xFOkZtN0HqM0w0O0W/NUqRNkelNEevNUlzNkWHN0jsM0zlM0xoN0RZOUbuM0zuM0zoM0zlM0zoM0znM0zqM0yGLz/rM0zmM0zpM0zrM0zpM0vlM0zlM0zmM0zlM0vqM0zlM0s0O0UlKzM3O0XwM0wyO0U1O0XYNEv/M037MkwuO0UoKzMmPEQqO0XrM0zUM0r1M0zuM0wfKzMaKjExN0HMM0nDNUq7MEUqLzg8O0U4LTZMLDcwKzR6OEgmOUJ8qQmRAAAAQnRSTlMA7PrP2Nv+AQL+/v79/f79OCv9/tXWZRBw/ZX9tUqPtI0VFkhIlwn//////////////////////////////v///v4ZlqZfAAABpElEQVR4AY2ThdYiMQyFcXeXdeuUhvoUZ/X9n2nT9vwwyEpw7jc3mdOb3LWqtVquVyz2crVaNfekUP7wueBcYfEevz+Tv8zyIh0MUpGf1e6RKpq+Hot5t25MvTsXo4/hr2zz/ivnWhVNKGW60nLubf86CsrTNwXRGGpJCRaVetgQhXfTS5/aJC/WHWMokFBAjeysRX4SdH9rwjaphihHBDRtWuFvGZHxql3RjOKFANjDvwPxo7RXo2BRWkuJfwHT0hgAY6RmEPqsS37Majn1zUHS5rHRwe6NY5MigcgFqDNCGDlyJ3i3y53jDVbHf+pZgOqf3G7sBgs/eOcXfQBaIsgB4c0dwD3QzALLndrXbwAwQ7e5lPu+VWp/OySYNrcvBq2dSpJkfwuwr4fYxIqDSsIjzQIEZCQsP/zYeoN7AE+RNoS1/KRQfwagh2wL0d6i+x1wOWdmjqfdRY/A5bCiR+Xbi7/abiNwOe7oIc9RT3bfWqvRY2DwHQmldmo5D4F5Frkzug9SHiL3PLTb76dMaJ/GXmRj/2xxPvm//rF6/7u8/1z/3wj1a5KmJvR/AAAAAElFTkSuQmCC", "base64");
	res.writeHead(200, {
		"Content-Type": "image/png",
		"Content-Length": img.length
	});
	res.end(img);
});
app.get("/clear", function(_, res) {
	client.torrents.forEach(async function(torrent) {
		torrent.destroy();
		await fs.promises.rm("/tmp/webtorrent/" + torrent.name, {
			force: true,
			recursive: true
		});
	});
	res.send("Cleared!");
});
app.get("/list", function(_, res) {
	res.send(`<html><head><title>MiPeerFlix</title><meta http-equiv="refresh" content="20"></head><body>${ client.torrents.length ? `<table>${ client.torrents.map(function (torrent) {
		return `<tr><td>${ torrent.infoHash }</td><td><a href ="/${ torrent.infoHash }">${ torrent.name ? torrent.name : torrent.infoHash }</a></td><td><a href="/remove/${ torrent.infoHash }">Remove</a></td></tr>`;
	}).join("")}</table>` : "No torrents in client!" }</body></html>`);
});
app.get("/terminal", function(req, res) {
	res.send(`<!DOCTYPE html> <html> <head> <title>Terminal</title> <link href="https://cdn.jsdelivr.net/npm/xterm/css/xterm.css" rel="stylesheet"> <style> html, .terminal { height: 100%; } body, #terminal { height: 100%; margin: 0; } </style> <script src="https://cdn.jsdelivr.net/npm/xterm/lib/xterm.min.js"></script> <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit/lib/xterm-addon-fit.min.js"></script> <script src="https://cdn.jsdelivr.net/npm/xterm-addon-webgl/lib/xterm-addon-webgl.min.js"></script> </head> <body> <div id="terminal"></div> <script type="text/javascript"> (function connect() { if ("WebSocket" in window) { const el = document.getElementById("terminal"); el.innerHTML = ""; const ws = new WebSocket("wss://" + window.location.host + "/terminal"); const terminal = new Terminal({ allowProposedApi: true, scrollback: 1000, tabStopWidth: 4, fontFamily: "Menlo, Consolas, Liberation Mono, Monaco, Lucida Console, monospace" }); terminal.open(el); terminal.focus(); const fitAddon = new FitAddon.FitAddon(); const webglAddon = new WebglAddon.WebglAddon(); terminal.loadAddon(webglAddon); terminal.loadAddon(fitAddon); terminal.onResize(function(size) { ws.send(JSON.stringify({ "type": "resize", "payload": size })); }); terminal.onData(function(data) { ws.send(JSON.stringify({ "type": "data", "payload": data })); }); ws.onopen = function() { fitAddon.fit(); }; ws.onmessage = function(e) { try { var data = JSON.parse(e.data); if (data.type === "data") { terminal.write(data.payload); } else if (data.type === "exit") { terminal.writeln("Terminal disconnected!"); } } catch (err) { console.log("ws.onmessage", err); } }; ws.onclose = function() { terminal.writeln("Terminal reconnecting..."); setTimeout(connect, 2000); }; window.onresize = function() { fitAddon.fit(); }; window.onbeforeunload = function() { if (ws.readyState === ws.OPEN) { ws.close(); } }; } else { alert("WebSocket is NOT supported by your browser!"); } })(); </script> </body> </html>`);
});
app.get("/:infoHash", async function(req, res) {
	if (req.params.infoHash.length === 40 && req.params.infoHash.match(/[\w\d]{40}/)) {
		const torrent = await getTorrent(req.params.infoHash);
		res.send(`<html><head><title>${ torrent.name ? torrent.name : req.params.infoHash }</title><meta http-equiv="refresh" content="${ torrent.done ? "60" : "5" }"><style>.title{font-weight:bold;}table{table-layout:fixed;width:100%;}td.title{width:140px;vertical-align:middle;}</style></head><body><div id="torrent"><table><tr><td class="title">Torrent Name:</td><td id="name">${ torrent.name ? torrent.name : req.params.infoHash }</td></tr><tr><td class="title">Torrent State:</td><td id="status">${ torrent.done ? torrent.progress === 1 ? "Downloaded" : "Stopped" : torrent.name && torrent.progress > 0 ? "Downloading" : "Getting metadata" }</td></tr><tr><td class="title">Peers:</td><td id="peers">${ torrent.numPeers }</td></tr><tr><td class="title">Download Rate:</td><td id="speed">${ humanFileSize(torrent.downloadSpeed) + "/s" }</td></tr><tr><td class="title">Time Remaining:</td><td id="remaining">${ humanTime(torrent.timeRemaining) }</td></tr></table><hr></div><div id="files">${ torrent.files.map(function (file, index, array) {
			return `<table id="${ index + 1 }"><tr><td class="title">File Path:</td><td>${ file.path }</td></tr><tr><td class="title">File Size:</td><td>${ humanFileSize(file.length) }</td></tr><tr><td class="title">Download Progress:</td><td>${ Math.floor(file.progress * 100) }%</td></tr><tr><td class="title"></td><td><a href="/stream/${ torrent.infoHash }/${ index + 1 }">Stream</a>${ torrent.done ? ` <a href="/download/${ torrent.infoHash }/${ file.path }">Download</a>` : "" }</td></tr></table>${ index !== array.length - 1 ? "<hr>" : "" }`;
		}).join("")}</div></script></body></html>`);
	} else {
		res.send("infoHash is incorrect!");
	}
});
app.get("/remove/:infoHash", async function(req, res) {
	if (req.params.infoHash.length === 40 && req.params.infoHash.match(/[\w\d]{40}/)) {
		let torrent = client.get(req.params.infoHash);
		if (torrent) {
			torrent.destroy();
			await fs.promises.rm("/tmp/webtorrent/" + torrent.name, {
				force: true,
				recursive: true
			});
		}
		res.send("Removed!");
	} else {
		res.send("infoHash is incorrect!");
	}
});
app.get("/stream/:infoHash/:index?", async function(req, res) {
	if (req.params.infoHash.length === 40 && req.params.infoHash.match(/[\w\d]{40}/)) {
		let torrent = await getTorrent(req.params.infoHash);
		let file;
		if (req.params.index) {
			file = torrent.files[parseInt(req.params.index, 10) - 1];
		} else {
			for (let i = 0; i < torrent.files.length; i++) {
				if (!file || file.length < torrent.files[i].length) {
					file = torrent.files[i];
				}
			}
		}
		if (file) {
			let start = 0;
			let end = file.length - 1;
			let header = {
				"Accept-Ranges": "bytes",
				"Content-Disposition": `filename="${ encodeURI(file.name) }"`,
				"Content-Length": file.length
			};
			header["Content-Type"] = await getContentType(file);
			if (req.headers.range) {
				let ranges = rangeParser(file.length, req.headers.range, {
					combine: true
				});
				if (ranges === -2) {
					res.status(400).end();
				} else if (ranges === -1) {
					res.status(416).end();
				} else {
					start = ranges[0].start;
					end = ranges[0].end;
					header["Content-Range"] = `bytes ${ start }-${ end }/${ file.length }`;
					header["Content-Length"] = ranges[0].end - ranges[0].start + 1;
					res.writeHead(206, header);
				}
			} else {
				res.writeHead(200, header);
			}
			stream.pipeline(file.createReadStream({
				start: start,
				end: end
			}), res, function() {});
		} else {
			res.sendStatus(404);
		}
	} else {
		res.send("infoHash is incorrect!");
	}
});
server.listen(3000, async function() {
	await fs.promises.mkdir("/tmp/webtorrent", {
		recursive: true
	});
	const files = await fs.promises.readdir("/tmp/webtorrent");
	for (const file of files) {
		await fs.promises.rm("/tmp/webtorrent/" + file, {
			force: true,
			recursive: true
		});
	}
	console.log("Running at Port 3000");
});

function getTorrent(infoHash) {
	var torrent = client.get(infoHash);
	if (!torrent) {
		torrent = client.add("magnet:?xt=urn:btih:" + infoHash, {
			announce: ["udp://93.158.213.92:1337", "udp://151.80.120.115:2810", "udp://45.154.253.7:6969", "http://45.154.253.7:80", "udp://91.216.110.52:451", "udp://185.181.60.155:80", "udp://5.79.216.168:6969", "udp://208.83.20.20:6969", "udp://65.108.63.133:80", "udp://107.189.11.230:6969", "udp://185.70.187.79:6969", "udp://185.134.22.3:6969", "udp://185.21.216.185:6969", "udp://216.146.25.92:1337", "udp://198.100.149.66:6969", "udp://148.251.53.72:6969", "udp://184.105.151.166:6969", "udp://119.28.71.45:8080", "wss://172.67.174.171", "wss://104.21.31.24", "wss://45.58.126.78", "wss://172.93.110.3", "wss://199.127.63.145", "wss://199.127.63.144", "wss://104.247.82.51"],
			destroyStoreOnDestroy: true,
			path: "/tmp/webtorrent/" + infoHash.toLowerCase()
		});
	}
	return torrent;
}

function getContentType(file) {
	return new Promise(function(resolve) {
		const myTimeout = setTimeout(function() {
			resolve("application/octet-stream");
		}, 5000);
		const signature = new streamSignature();
		file.createReadStream({
			start: 0,
			end: 512
		}).pipe(signature);
		signature.on("signature", function(signature) {
			clearTimeout(myTimeout);
			if ("mimetype" in signature) {
				resolve(signature.mimetype);
			} else {
				resolve("application/octet-stream");
			}
		});
	});
}

function humanTime(ms) {
	var seconds = ms / 1000;
	var result = "";
	var days = Math.floor((seconds % 31536000) / 86400);
	if (days > 0) result += "".concat(days, "d ");
	var hours = Math.floor(((seconds % 31536000) % 86400) / 3600);
	if (hours > 0) result += "".concat(hours, "h ");
	var minutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
	if (minutes > 0) result += "".concat(minutes, "m ");
	seconds = ((((seconds % 31536000) % 86400) % 3600) % 60).toFixed(0);
	if (seconds > 0) result += "".concat(seconds, "s");
	if (result === "") result += "0s";
	return result;
}

function humanFileSize(size) {
	if (size > 0) {
		var i = Math.floor(Math.log(size) / Math.log(1024));
		return (
			(size / Math.pow(1024, i)).toFixed(2) * 1 + " " + ["B", "kB", "MB", "GB", "TB"][i]);
	} else {
		return "0 B";
	}
}