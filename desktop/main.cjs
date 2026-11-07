const { app, BrowserWindow, shell, ipcMain } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
};

let server;
let localOrigin;

ipcMain.on('kido:quit', (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  if (senderWindow) app.quit();
});

function serveFile(req, res) {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(req.url, localOrigin).pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  if (pathname.includes('\0')) {
    res.writeHead(400).end('Bad request');
    return;
  }

  let filePath = path.resolve(DIST_DIR, `.${pathname}`);

  if (filePath !== DIST_DIR && !filePath.startsWith(DIST_DIR + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const cleanRoute = `${filePath}.html`;
    if (fs.existsSync(cleanRoute)) filePath = cleanRoute;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    const notFound = path.join(DIST_DIR, '+not-found.html');

    if (fs.existsSync(notFound)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(notFound).pipe(res);
    } else {
      res.writeHead(404).end('Page not found');
    }
    return;
  }

  const contentType =
    MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  });

  fs.createReadStream(filePath).pipe(res);
}

async function createWindow() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('Kido web build not found. Run npm run build:web first.');
  }

  server = http.createServer(serveFile);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  localOrigin = `http://127.0.0.1:${address.port}`;

  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== localOrigin) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
      }
    }
  });

  await window.loadURL(`${localOrigin}/`);
}

app.whenReady().then(createWindow).catch((error) => {
  console.error('Kido desktop startup failed:', error);
  app.quit();
});

app.on('before-quit', () => {
  if (server) server.close();
});

app.on('window-all-closed', () => {
  app.quit();
});
