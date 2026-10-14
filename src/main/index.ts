import { existsSync } from 'fs'
import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { getDatabasePath, openDatabase, closeDatabase } from './db/connection'
import { runMigrations } from './db/migrations'
import { registerIpcHandlers } from './ipc/handlers'
import { processBirthdayBonuses } from './services/birthdayService'
import { setupAutoUpdater } from './updater'

let mainWindow: BrowserWindow | null = null

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function resolveAppIcon(): string {
  const candidates = [
    join(process.resourcesPath || '', 'icon.ico'),
    join(__dirname, '../../build/icon.ico'),
    join(__dirname, '../../resources/icon.ico')
  ]
  return candidates.find((p) => existsSync(p)) || candidates[1]
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'Angel Nails Club',
    backgroundColor: '#fdf2f6',
    icon: resolveAppIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)

  const userData = app.getPath('userData')
  const dbPath = getDatabasePath(userData)
  const db = await openDatabase(dbPath)
  runMigrations(db)

  registerIpcHandlers(getMainWindow)
  createWindow()
  setupAutoUpdater(getMainWindow)

  try {
    processBirthdayBonuses()
  } catch {
    // Non-fatal
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
