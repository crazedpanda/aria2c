var removed = false;
(function() {
	document.getElementById("loading").style.display = "block";
	document.getElementById("torrent").style.display = "none";
	document.getElementById("files").style.display = "none";
	loadTorent();
})();

function makeRequest(url, method) {
	return new Promise(function(resolve, reject) {
		var request = new XMLHttpRequest();
		request.timeout = 5000;
		request.onreadystatechange = function() {
			if (request.readyState !== 4) return;
			if (request.status >= 200 && request.status < 300) {
				resolve(request);
			} else {
				reject({
					status: request.status,
					statusText: request.statusText
				});
			}
		};
		request.open(method || "GET", url, true);
		request.send();
	});
}

function loadTorent() {
	var infoHash = window.location.pathname.slice(1).toLowerCase();
	return makeRequest("./add/" + infoHash).then(function(request) {
		console.log('loadTorent');
		var json = JSON.parse(request.responseText);
		if (!json.error && json.message.name) {
			document.getElementById("loading").style.display = "none";
			document.getElementById("torrent").style.display = "block";
			document.getElementById("files").style.display = "block";
			var data = json.message;
			document.title = "MiPeerFlix - " + data.name;
			document.getElementById("reload").href = "/" + infoHash;
			document.getElementById("name").innerHTML = data.name;
			document.getElementById("status").innerHTML = data.status;
			document.getElementById("peers").innerHTML = data.numPeers;
			document.getElementById("speed").innerHTML = data.speed;
			document.getElementById("remaining").innerHTML = data.readableTimeRemaining;
			var html = "";
			for (var i = 0; i < data.files.length; i++) {
				html += "<table id=\"" + (i + 1) + "\"><tr><td class=\"title\">File Path:</td><td>" + data.files[i].path + "</td></tr><tr><td class=\"title\">File Size:</td><td>" + data.files[i].total + "</td></tr><tr><td class=\"title\">Download Progress:</td><td>" + data.files[i].progress + "%</td></tr><tr><td class=\"title\"></td><td><a href=\"/stream/" + infoHash + "/" + (i + 1) + "\">Stream</a> | <a href=\"/download/" + infoHash + "/" + (i + 1) + "\">Download</a></td></tr></table>";
				if (i != data.files.length - 1) {
					html += '<hr>';
				}
			}
			document.getElementById("files").innerHTML = html;
		}
		return new Promise(function(resolve) {
			setTimeout(resolve, 15000);
		}).then(function() {
			if (!removed) {
				return getStatus();
			}
		});
	}).catch(function(error) {
		console.log('loadTorent', error);
		if (!removed) {
			return loadTorent();
		}
	});
}

function removeTorrent() {
	var infoHash = window.location.pathname.slice(1).toLowerCase();
	return makeRequest("./remove/" + infoHash).then(function(request) {
		var json = JSON.parse(request.responseText);
		if (!json.error) {
			removed = true;
			document.body.innerHTML = "Torrent removed!";
		}
	});
}

function getStatus() {
	var infoHash = window.location.pathname.slice(1).toLowerCase();
	return makeRequest("./status/" + infoHash).then(function(request) {
		console.log('getStatus');
		var json = JSON.parse(request.responseText);
		if (!json.error && json.message.name) {
			document.getElementById("loading").style.display = "none";
			document.getElementById("torrent").style.display = "block";
			document.getElementById("files").style.display = "block";
			var data = json.message;
			document.title = "MiPeerFlix - " + data.name;
			document.getElementById("reload").href = "/" + infoHash;
			document.getElementById("name").innerHTML = data.name;
			document.getElementById("status").innerHTML = data.status;
			document.getElementById("peers").innerHTML = data.numPeers;
			document.getElementById("speed").innerHTML = data.speed;
			document.getElementById("remaining").innerHTML = data.readableTimeRemaining;
			var html = "";
			for (var i = 0; i < data.files.length; i++) {
				html += "<table id=\"" + (i + 1) + "\"><tr><td class=\"title\">File Path:</td><td>" + data.files[i].path + "</td></tr><tr><td class=\"title\">File Size:</td><td>" + data.files[i].total + "</td></tr><tr><td class=\"title\">Download Progress:</td><td>" + data.files[i].progress + "%</td></tr><tr><td class=\"title\"></td><td><a href=\"/stream/" + infoHash + "/" + (i + 1) + "\">Stream</a> | <a href=\"/download/" + infoHash + "/" + (i + 1) + "\">Download</a></td></tr></table>";
				if (i != data.files.length - 1) {
					html += '<hr>';
				}
			}
			document.getElementById("files").innerHTML = html;
		}
		return new Promise(function(resolve) {
			setTimeout(resolve, 15000);
		}).then(function() {
			if (!removed) {
				return getStatus();
			}
		});
	}).catch(function(error) {
		console.log('getStatus', error);
		return new Promise(function(resolve) {
			setTimeout(resolve, 15000);
		}).then(function() {
			if (!removed) {
				return getStatus();
			}
		});
	});
}
