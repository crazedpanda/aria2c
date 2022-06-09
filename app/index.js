import serveStatic from "serve-static";
import {
	App
} from "@tinyhttp/app";
import {
	tinyws
} from "tinyws";
import terminalRouter from "./routes/terminal.js";
import webtorrentRouter from "./routes/webtorrent.js";
const app = new App();
app.use(tinyws());
app.use(serveStatic("public"));
app.use("/files", serveStatic("/tmp/webtorrent"));
app.use(terminalRouter);
app.use(webtorrentRouter);
app.get("/", function(_, res) {
	if ("HEROKU_APP_NAME" in process.env) {
		res.send("Hello World from " + process.env.HEROKU_APP_NAME + "!");
	} else {
		res.send("Hello World!");
	}
});
app.get("/ping", function(_, res) {
	res.set("cache-control", "no-store");
	res.send("OK");
});
app.listen(3000, function() {
	console.log("Server is running at 3000");
});
