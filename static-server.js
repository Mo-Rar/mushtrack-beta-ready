const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.argv[2] || 4399);
const host = process.argv[3] || "127.0.0.1";
const logFile = path.join(root, "server.log");

function log(message) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);
}

process.on("uncaughtException", (error) => {
  log(`UNCAUGHT ${error.stack || error.message}`);
});

process.on("unhandledRejection", (error) => {
  log(`UNHANDLED ${error && error.stack ? error.stack : error}`);
});

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png"
};

const server = http.createServer((request, response) => {
  const cleanUrl = decodeURIComponent((request.url || "/").split("?")[0]);
  const relative = cleanUrl === "/" ? "index.html" : cleanUrl.replace(/^\/+/, "");
  const filePath = path.resolve(root, relative);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
    });
    response.end(data);
  });
});

server.on("error", (error) => {
  log(`SERVER_ERROR ${error.stack || error.message}`);
});

server.listen(port, host, () => {
  log(`RUNNING http://${host}:${port}/`);
  console.log(`MushTrack running at http://${host}:${port}/`);
});
