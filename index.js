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
  res.send("Hello World!");
});
app.get("/ping", function(_, res) {
	res.set("cache-control", "no-store");
	res.send("OK");
});
app.listen(process.env.PORT, function() {
	console.log("Server is running at " + process.env.PORT);
});