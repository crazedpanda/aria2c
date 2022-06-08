import express from "express";
import pty from "node-pty";
const router = express.Router();
router.use("/", async function(req, res, next) {
	if (req.ws) {
		const ws = await req.ws();
		const term = pty.spawn("bash", [], {
			name: "xterm-color",
			cols: 30,
			rows: 80,
			cwd: process.env.HOME,
			env: process.env
		});
		console.log(`Created terminal with PID: ${term.pid}`);
		term.on("data", function(data) {
			if (ws.readyState === ws.OPEN) {
	      ws.send(JSON.stringify({
		"type": "data",
		"payload": data
	      }));
			}
		});
		term.on("exit", function() {
			if (ws.readyState === ws.OPEN) {
				ws.send(JSON.stringify({
					"type": "exit"
				}));
				ws.close();
			}
		});
		ws.on("message", function(message) {
			try {
				var data = JSON.parse(message);
				if (data.type == "data") {
					term.write(data.payload);
				} else if (data.type == "resize") {
					const cols = data.payload.cols || 80;
					const rows = data.payload.rows || 30;
					term.resize(cols, rows);
					console.log(`Resized terminal ${term.pid} to ${cols} cols and ${rows} rows`);
				}
			} catch (err) {
				console.log("ws.onmessage", err);
			}
		});
		ws.on("close", function() {
			term.kill();
			console.log(`Closed terminal with PID: ${term.pid}`);
		});
	} else {
		next();
	}
});
router.get("/", function(req, res) {
	res.send(`<!DOCTYPE html> <html> <head> <title>Terminal</title> <link href="https://cdn.jsdelivr.net/npm/xterm/css/xterm.css" rel="stylesheet"> <style> html, .terminal { height: 100%; } body, #terminal { height: 100%; margin: 0; } </style> <script src="https://cdn.jsdelivr.net/npm/xterm/lib/xterm.min.js"></script> <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit/lib/xterm-addon-fit.min.js"></script> <script src="https://cdn.jsdelivr.net/npm/xterm-addon-webgl/lib/xterm-addon-webgl.min.js"></script> </head> <body> <div id="terminal"></div> <script type="text/javascript"> (function connect() { if ("WebSocket" in window) { const el = document.getElementById("terminal"); el.innerHTML = ""; const ws = new WebSocket("wss://" + window.location.host + "/terminal"); const terminal = new Terminal({ scrollback: 1000, tabStopWidth: 4, fontFamily: "Menlo, Consolas, Liberation\ Mono, Monaco, Lucida\ Console, monospace" }); terminal.open(el); terminal.focus(); const fitAddon = new FitAddon.FitAddon(); const webglAddon = new WebglAddon.WebglAddon(); terminal.loadAddon(webglAddon); terminal.loadAddon(fitAddon); terminal.onResize(function(size) { ws.send(JSON.stringify({ "type": "resize", "payload": size })); }); terminal.onData(function(data) { ws.send(JSON.stringify({ "type": "data", "payload": data })); }); ws.onopen = function() { fitAddon.fit(); }; ws.onmessage = function(e) { try { var data = JSON.parse(e.data); if (data.type == "data") { terminal.write(data.payload); } else if (data.type == "exit") { terminal.writeln("Terminal disconnected!"); } } catch (err) { console.log("ws.onmessage", err); } }; ws.onclose = function() { terminal.writeln("Terminal reconnecting..."); setTimeout(connect, 2000); }; window.onresize = function() { fitAddon.fit(); }; window.onbeforeunload = function() { if (ws.readyState === ws.OPEN) { ws.close(); } }; } else { alert("WebSocket is NOT supported by your browser!"); } })(); </script> </body> </html>`);
});
export default router
