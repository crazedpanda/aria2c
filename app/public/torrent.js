(function connect() {
	document.getElementById("loading").style.display = "block";
	document.getElementById("torrent").style.display = "none";
	document.getElementById("files").style.display = "none";
	if ("WebSocket" in window) {
		const infoHash = window.location.pathname.slice(1).toLowerCase();
		const ws = new WebSocket("wss://" + window.location.host + "/" + infoHash);
		ws.onopen = function() {
			console.log("Connected!");
		};
		ws.onmessage = function(e) {
			try {
				var data = JSON.parse(e.data);
				if (data.type == "message") {
					document.getElementById("loading").style.display = "none";
					document.getElementById("torrent").style.display = "block";
					document.getElementById("files").style.display = "block";
					if ("name" in data.payload) {
						document.title = "MiPeerFlix - " + data.payload.name;
						document.getElementById("name").innerHTML = data.payload.name;
					}
					document.getElementById("status").innerHTML = data.payload.status;
					document.getElementById("peers").innerHTML = data.payload.numPeers;
					document.getElementById("speed").innerHTML = data.payload.speed;
					document.getElementById("remaining").innerHTML = data.payload.readableTimeRemaining;
					document.getElementById("files").innerHTML = data.payload.files.map(function(file, index, array) {
						return "<table id=\"" + (index + 1) + "\"><tr><td class=\"title\">File Path:</td><td>" + file.path + "</td></tr><tr><td class=\"title\">File Size:</td><td>" + file.total + "</td></tr><tr><td class=\"title\">Download Progress:</td><td>" + file.progress + "%</td></tr><tr><td class=\"title\"></td><td><a href=\"/stream/" + infoHash + "/" + (index + 1) + "\">Stream</a>" + (file.progress == 1 ? " <a href=\"/download/" + infoHash + "/" + (index + 1) + "\">Download</a>" : "") + "</td></tr></table>" + (index != array.length - 1 ? "<hr>" : "");
					}).join("");
				} else if (data.type == "error") {
					console.log("error", data.payload);
				}
			} catch (err) {
				console.log("ws.onmessage", err);
			}
		};
		ws.onclose = function() {
			console.log("Disconnected!");
			setTimeout(connect, 5000);
		};
		window.onbeforeunload = function() {
			if (ws.readyState === ws.OPEN) {
				ws.close();
			}
		};
	} else {
		alert("WebSocket is NOT supported by your browser!");
	}
})();
