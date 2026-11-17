import { app, BrowserWindow, Menu, protocol, session } from 'electron';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetPath, serveAsset } from './content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), 'public');
// A separate stable profile keeps this prototype away from web and mobile saves.
app.setPath('userData', app.commandLine.getSwitchValue('user-data-dir') ||
  join(app.getPath('appData'), 'GravityGolfSteamPrototype'));
protocol.registerSchemesAsPrivileged([{ scheme: 'gg', privileges: {
  standard: true, secure: true, supportFetchAPI: true, stream: true,
} }]);

async function startDesktop() {
  const manifest = JSON.parse(await readFile(join(root, 'build-manifest.json'), 'utf8'));
  const files = manifest.files;
  files['build-manifest.json'] = {};
  protocol.handle('gg', request => serveAsset(request, root, files));
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.on('will-download', event => event.preventDefault());
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !assetPath(details.url, files) && !details.url.startsWith('data:') });
  });

  function secureWindow(options) {
    const win = new BrowserWindow({ backgroundColor: '#07060c', show: false, ...options,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true,
        webSecurity: true, webviewTag: false, allowRunningInsecureContent: false,
        devTools: !app.isPackaged } });
    win.webContents.on('will-navigate', event => event.preventDefault());
    win.webContents.on('will-redirect', event => event.preventDefault());
    win.webContents.on('will-attach-webview', event => event.preventDefault());
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.once('ready-to-show', () => win.show());
    return win;
  }

  function createGame() {
    const win = secureWindow({ width: 1280, height: 800, minWidth: 960, minHeight: 640,
      title: 'Gravity Golf - Desktop Prototype' });
    win.webContents.setWindowOpenHandler(({ url }) => {
      // Notices are local, isolated and cannot replace the running game.
      if (assetPath(url, files) === 'notices.html') {
        const notices = secureWindow({ width: 820, height: 680, parent: win, title: 'Third-Party Notices' });
        notices.webContents.on('will-navigate', (_event, target) => {
          const path = assetPath(target, files);
          if (path === 'notices.html' || path?.startsWith('licenses/')) void notices.loadURL(target);
        });
        void notices.loadURL('gg://game/notices.html');
      }
      return { action: 'deny' };
    });
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
      if (input.key === 'Escape' && win.isFullScreen()) { event.preventDefault(); win.setFullScreen(false); }
    });
    void win.loadURL('gg://game/index.html');
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'Gravity Golf', submenu: [{ role: 'about' },
      { type: 'separator' }, { role: 'hide' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] }] : []),
    { label: 'Game', submenu: [{ role: 'togglefullscreen' }, { type: 'separator' }, { role: 'quit' }] },
  ]));
  createGame();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createGame(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}

// Electron waits for ESM evaluation before ready; top-level await here would deadlock.
void app.whenReady().then(startDesktop).catch(error => {
  console.error('Gravity Golf desktop startup failed:', error);
  app.exit(1);
});
