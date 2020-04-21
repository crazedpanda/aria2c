package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"github.com/anacrolix/torrent"
	"golang.org/x/time/rate"
	"github.com/gorilla/mux"
	"io"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"time"
)

type serviceSettings struct {
	Host           string
	Port           int
	DownloadDir    string
	DownloadRate   int
	UploadRate     int
	MaxConnections int
	NoDHT          bool
	NoUpload       bool
	Seed           bool
}

var procQuit chan bool
var procError chan string

func quit(cl *torrent.Client, srv *http.Server) {
	fmt.Println("Quitting")
	os.RemoveAll("/tmp/torrents")
	srv.Close()
	cl.Close()
}

func handleSignals() {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	go func() {
		for _ = range c {
			procQuit <- true
		}
	}()
}

func main() {
	procQuit = make(chan bool)
	procError = make(chan string)
	var settings serviceSettings
	settings.Host = ""
	settings.Port = 8080
	settings.DownloadDir = "/tmp/torrents/"
	settings.DownloadRate = -1
	settings.UploadRate = -1
	settings.MaxConnections = 55
	settings.NoDHT = false
	settings.NoUpload = true
	settings.Seed = false
	handleSignals()
	cl := startTorrent(settings)
	srv := startHTTPServer(fmt.Sprintf("%s:%d", settings.Host, settings.Port), cl)
	select {
	case err := <-procError:
		fmt.Println(err)
		quit(cl, srv)
	case <-procQuit:
		quit(cl, srv)
	}
}

func sendList(w http.ResponseWriter, torr *torrent.Torrent, address string) {
	torrent := parseTorrent(torr)
	var list bytes.Buffer
	appendString(&list, "<head><meta http-equiv=\"refresh\" content=\"15\"/><title>MiPeerFlix - ", torrent.Name, "</title></head><b>Menu:</b> <a href=\"/remove/", torrent.InfoHash, "\">Remove</a><br><b>Peers:</b> ", strconv.Itoa(torrent.ActivePeers), " (Active) | ", strconv.Itoa(torrent.ConnectedSeeders), " (Seeders) | ", strconv.Itoa(torrent.TotalPeers), " (Total)<hr>")
	for _, f := range torrent.Files {
		path := filepath.Base(f.Path)
		appendString(&list, "<table class=\"torrent\" id=\"", torrent.InfoHash, "\" style=\"width:100%\"><tr class=\"filepath\"><td style=\"font-weight:bold;width:140px;vertical-align:middle\">File Path:</td><td><a href=\"http://", address, "/stream/", torrent.InfoHash, "/", base64.StdEncoding.EncodeToString([]byte(path)), "\">", f.Path, "</a></td></tr><tr class=\"filesize\"><td style=\"font-weight:bold;width:140px;vertical-align:middle\">File Size:</td><td>", strconv.FormatInt(f.Size, 10), " bytes</td></tr><tr class=\"fileprogress\"><td style=\"font-weight:bold;width:140px;vertical-align:middle\">Download Progress:</td><td>", fmt.Sprintf("%f", f.Percent), "%</td></tr></table><hr>")
	}
	io.WriteString(w, list.String())
}

func handleAPI(cl *torrent.Client) {
	routerAPI := mux.NewRouter()
	routerAPI.SkipClean(true)
	routerAPI.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "<head><title>MiPeerFlix</title></head>Hello world!")
	})
	routerAPI.HandleFunc("/list", func(w http.ResponseWriter, r *http.Request) {
		var list bytes.Buffer
		appendString(&list, "<head><meta http-equiv=\"refresh\" content=\"15\"/><title>MiPeerFlix - List</title></head><table>")
		for key, torrent := range torrents {
			appendString(&list, "<tr><td>", torrent.Name(),"</td><td><a href=\"http://", r.Host, "/", torrent.InfoHash().String(), "\">", key, "</a></td></tr>")
		}
		appendString(&list, "</table>")
		io.WriteString(w, list.String())
	})
	routerAPI.HandleFunc("/remove/{hash}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		if t, ok := torrents[vars["hash"]]; ok {
			t.Drop()
			os.RemoveAll("/tmp/torrents/" + t.Name())
			delete(torrents, vars["hash"])
			io.WriteString(w, "<head><title>MiPeerFlix</title></head>Hash removed!")
		} else {
			io.WriteString(w, "<head><title>MiPeerFlix</title></head>Hash already removed!")
		}
	})
	routerAPI.HandleFunc("/stream/{hash}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		if t, ok := torrents[vars["hash"]]; ok {
			file := getLargestFile(t.Files())
			path := file.DisplayPath()
			incFileClients(path)
			serveTorrentFile(w, r, file)
			if decFileClients(path) <= 0 {
				stopDownloadFile(file)
			}
		} else {
			magnet := "magnet:?xt=urn:btih:" + vars["hash"]
			if t := addMagnet(magnet, cl); t != nil {
				file := getLargestFile(t.Files())
				path := file.DisplayPath()
				incFileClients(path)
				serveTorrentFile(w, r, file)
				if decFileClients(path) <= 0 {
					stopDownloadFile(file)
				}
			} else {
				http.Redirect(w, r, "/stream/" + vars["hash"], http.StatusMovedPermanently)
			}
		}
	})
	routerAPI.HandleFunc("/stream/{hash}/{base64path}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		if t, ok := torrents[vars["hash"]]; ok {
			if d, err := base64.StdEncoding.DecodeString(vars["base64path"]); err == nil {
				idx := getFileByPath(string(d), t.Files())
				file := t.Files()[idx]
				path := file.DisplayPath()
				incFileClients(path)
				serveTorrentFile(w, r, file)
				if decFileClients(path) <= 0 {
					stopDownloadFile(file)
				}
			} else {
				io.WriteString(w, "Error: File is incorrect!")
			}
		} else {
			magnet := "magnet:?xt=urn:btih:" + vars["hash"]
			if t := addMagnet(magnet, cl); t != nil {
				if d, err := base64.StdEncoding.DecodeString(vars["base64path"]); err == nil {
					idx := getFileByPath(string(d), t.Files())
					file := t.Files()[idx]
					path := file.DisplayPath()
					incFileClients(path)
					serveTorrentFile(w, r, file)
					if decFileClients(path) <= 0 {
						stopDownloadFile(file)
					}
				} else {
					io.WriteString(w, "Error: File is incorrect!")
				}
			} else {
				http.Redirect(w, r, "/stream/" + vars["hash"] + "/" + vars["base64path"], http.StatusMovedPermanently)
			}
		}
		return
	})
	routerAPI.HandleFunc("/{hash}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		if t, ok := torrents[vars["hash"]]; ok {
			sendList(w, t, r.Host)
		} else {
			if len(vars["hash"]) == 40 {
				magnet := "magnet:?xt=urn:btih:" + vars["hash"]
				if t := addMagnet(magnet, cl); t != nil {
					sendList(w, t, r.Host)
				}
			} else {
				io.WriteString(w, "Error: Unable to load hash!")
			}
		}
	})
	http.Handle("/", routerAPI)
}

func startHTTPServer(addr string, cl *torrent.Client) *http.Server {
	srv := &http.Server{
		Addr: addr,
	}
	handleAPI(cl)
	go func() {
		if err := srv.ListenAndServe(); err != nil {
			fmt.Printf("Httpserver: ListenAndServe() error: %s\n", err)
			procQuit <- true
		}
	}()
	return srv
}

var torrents map[string]*torrent.Torrent
var fileClients map[string]int

func startTorrent(settings serviceSettings) *torrent.Client {
	torrents = make(map[string]*torrent.Torrent)
	fileClients = make(map[string]int)
	cfg := torrent.NewDefaultClientConfig()
	cfg.DataDir = settings.DownloadDir
	cfg.EstablishedConnsPerTorrent = settings.MaxConnections
	cfg.NoDHT = settings.NoDHT
	cfg.NoUpload = settings.NoUpload
	cfg.Seed = settings.Seed
	if settings.UploadRate != -1 {
		cfg.UploadRateLimiter = rate.NewLimiter(rate.Limit(settings.UploadRate), 256<<10)
	}
	if settings.DownloadRate != -1 {
		cfg.DownloadRateLimiter = rate.NewLimiter(rate.Limit(settings.DownloadRate), 1<<20)
	}
	cl, err := torrent.NewClient(cfg)
	if err != nil {
		procError <- err.Error()
	}
	return cl
}

func incFileClients(path string) int {
	if v, ok := fileClients[path]; ok {
		v++
		fileClients[path] = v
		return v
	} else {
		fileClients[path] = 1
		return 1
	}
}

func decFileClients(path string) int {
	if v, ok := fileClients[path]; ok {
		v--
		fileClients[path] = v
		return v
	} else {
		fileClients[path] = 0
		return 0
	}
}

func addMagnet(uri string, cl *torrent.Client) *torrent.Torrent {
	spec, err := torrent.TorrentSpecFromMagnetURI(uri)
	if err != nil {
		fmt.Println(err)
		return nil
	}
	infoHash := spec.InfoHash.String()
	if t, ok := torrents[infoHash]; ok {
		return t
	}
	if t, err := cl.AddMagnet(uri); err != nil {
		fmt.Println(err)
		return nil
	} else {
		<-t.GotInfo()
		torrents[t.InfoHash().String()] = t
		return t
	}
}

func stopDownloadFile(file *torrent.File) {
	if file != nil {
		file.SetPriority(torrent.PiecePriorityNone)
	}
}

func appendString(buf *bytes.Buffer, strs ...string) {
	for _, s := range strs {
		buf.WriteString(s)
	}
}

func percent(n, total int64) float32 {
	if total == 0 {
		return float32(0)
	}
	return float32(int(float64(10000)*(float64(n)/float64(total)))) / 100
}

type Torrent struct {
	InfoHash         string
	Name             string
	Loaded           bool
	Downloaded       int64
	Size             int64
	Files            []*File
	Percent          float32
	TotalPeers       int
	ActivePeers      int
	ConnectedSeeders int
}

type File struct {
	Path      string
	Size      int64
	Chunks    int
	Completed int
	Percent   float32
}

func parseTorrent(torr *torrent.Torrent) Torrent {
	var torrent Torrent
	torrent.InfoHash = torr.InfoHash().String()
	torrent.Name = torr.Name()
	torrent.Loaded = torr.Info() != nil
	if torrent.Loaded {
		torrent.Size = torr.Length()
		totalChunks := 0
		totalCompleted := 0
		tfiles := torr.Files()
		if len(tfiles) > 0 && torrent.Files == nil {
			torrent.Files = make([]*File, len(tfiles))
		}
		for i, f := range tfiles {
			file := torrent.Files[i]
			if file == nil {
				file = &File{Path: f.Path()}
				torrent.Files[i] = file
			}
			chunks := f.State()
			file.Size = f.Length()
			file.Chunks = len(chunks)
			completed := 0
			for _, p := range chunks {
				if p.Complete {
					completed++
				}
			}
			file.Completed = completed
			file.Percent = percent(int64(file.Completed), int64(file.Chunks))
			totalChunks += file.Chunks
			totalCompleted += file.Completed
		}
		torrent.Downloaded = torr.BytesCompleted()
		torrent.Percent = percent(torrent.Downloaded, torrent.Size)
		stats := torr.Stats()
		torrent.TotalPeers = stats.TotalPeers
		torrent.ActivePeers = stats.ActivePeers
		torrent.ConnectedSeeders = stats.ConnectedSeeders
	}
	return torrent
}

func getFileByPath(search string, files []*torrent.File) int {
	for i, f := range files {
		if search == f.DisplayPath() {
			return i
		}
	}
	return -1
}

func getLargestFile(files []*torrent.File) *torrent.File {
	var target *torrent.File
	var maxSize int64
	for _, file := range files {
		if maxSize < file.Length() {
			maxSize = file.Length()
			target = file
		}
	}
	return target
}

func serveTorrentFile(w http.ResponseWriter, r *http.Request, file *torrent.File) {
	reader := file.NewReader()
	buffer := make([]byte, 512)
	_, err := reader.Read(buffer)
	if err != nil {
		return
	}
	reader.Seek(0, 0)
	contentType := http.DetectContentType(buffer)
	path := file.FileInfo().Path
	fname := ""
	if len(path) == 0 {
		fname = file.DisplayPath()
	} else {
		fname = path[len(path)-1]
	}
	w.Header().Set("Content-Disposition", "filename="+fname)
	w.Header().Set("Content-Type", contentType)
	http.ServeContent(w, r, fname, time.Unix(0, 0), reader)
}
