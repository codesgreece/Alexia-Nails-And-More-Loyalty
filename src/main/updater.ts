import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateCheckResult, UpdateStatusPayload } from '@shared/types'
import { isNewerVersion } from '@shared/version'

/**
 * GitHub Releases updater (electron-updater).
 *
 * Feed is embedded at build time from package.json → build.publish:
 *   owner: codesgreece
 *   repo: Alexia-Nails-And-More-Loyalty
 *
 * Offline: check/download fail gracefully; the app keeps working.
 * Dev: update checks are disabled unless ANGEL_NAILS_FORCE_UPDATES=1.
 */

let configured = false
let checking = false
let downloading = false
let updateDownloaded = false
let downloadedVersion: string | undefined
let lastCheckedVersion: string | undefined

function sendStatus(getMainWindow: () => BrowserWindow | null, payload: UpdateStatusPayload): void {
  getMainWindow()?.webContents.send('updates:status', payload)
}

function isDevUpdatesForced(): boolean {
  return process.env.ANGEL_NAILS_FORCE_UPDATES === '1'
}

function updatesAllowed(): boolean {
  return app.isPackaged || isDevUpdatesForced()
}

function friendlyUpdateError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const lower = raw.toLowerCase()
  if (lower.includes('enotfound') || lower.includes('net::') || lower.includes('offline')) {
    return 'Χωρίς σύνδεση internet. Η εφαρμογή συνεχίζει κανονικά offline.'
  }
  if (lower.includes('404') || lower.includes('latest.yml') || lower.includes('cannot find')) {
    return 'Η ενημέρωση δεν είναι ακόμα διαθέσιμη στο GitHub. Δοκιμάστε ξανά σε λίγο.'
  }
  if (lower.includes('401') || lower.includes('403') || lower.includes('authentication')) {
    return 'Αδυναμία πρόσβασης στο αποθετήριο ενημερώσεων.'
  }
  return 'Αδυναμία ελέγχου ενημερώσεων. Δοκιμάστε ξανά αργότερα.'
}

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  if (!updatesAllowed()) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowDowngrade = false

  // Explicit feed matching package.json build.publish (also baked into app-update.yml).
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'codesgreece',
    repo: 'Alexia-Nails-And-More-Loyalty'
  })

  autoUpdater.on('checking-for-update', () => {
    sendStatus(getMainWindow, { type: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    lastCheckedVersion = info.version
    sendStatus(getMainWindow, {
      type: 'available',
      version: info.version
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    lastCheckedVersion = info.version
    sendStatus(getMainWindow, {
      type: 'not-available',
      version: info.version
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendStatus(getMainWindow, {
      type: 'progress',
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    downloading = false
    updateDownloaded = true
    downloadedVersion = info.version
    sendStatus(getMainWindow, {
      type: 'downloaded',
      version: info.version
    })
  })

  autoUpdater.on('error', (err) => {
    checking = false
    downloading = false
    sendStatus(getMainWindow, {
      type: 'error',
      message: friendlyUpdateError(err)
    })
  })

  configured = true
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion()

  if (!updatesAllowed()) {
    return {
      updateAvailable: false,
      currentVersion,
      message: 'Ο έλεγχος ενημερώσεων είναι διαθέσιμος μόνο στην εγκατεστημένη έκδοση'
    }
  }

  if (!configured) {
    return {
      updateAvailable: false,
      currentVersion,
      message: 'Οι ενημερώσεις δεν έχουν αρχικοποιηθεί'
    }
  }

  if (checking) {
    return {
      updateAvailable: Boolean(
        lastCheckedVersion && isNewerVersion(lastCheckedVersion, currentVersion)
      ),
      currentVersion,
      latestVersion: lastCheckedVersion,
      message: 'Ο έλεγχος ενημερώσεων βρίσκεται ήδη σε εξέλιξη'
    }
  }

  if (updateDownloaded && downloadedVersion) {
    return {
      updateAvailable: true,
      currentVersion,
      latestVersion: downloadedVersion,
      downloaded: true,
      message: `Η έκδοση ${downloadedVersion} έχει ήδη ληφθεί. Εγκαταστήστε όταν είστε έτοιμοι.`
    }
  }

  checking = true
  try {
    const result = await autoUpdater.checkForUpdates()
    const latest = result?.updateInfo?.version
    const available = Boolean(latest && isNewerVersion(latest, currentVersion))
    lastCheckedVersion = latest

    return {
      updateAvailable: available,
      currentVersion,
      latestVersion: latest,
      releaseNotes:
        typeof result?.updateInfo?.releaseNotes === 'string'
          ? result.updateInfo.releaseNotes
          : undefined,
      message: available
        ? `Διαθέσιμη ενημέρωση: ${latest}`
        : 'Έχετε την πιο πρόσφατη έκδοση'
    }
  } catch (err) {
    return {
      updateAvailable: false,
      currentVersion,
      message: friendlyUpdateError(err)
    }
  } finally {
    checking = false
  }
}

export async function downloadUpdate(): Promise<{
  success: boolean
  message: string
  alreadyDownloaded?: boolean
}> {
  if (!updatesAllowed() || !configured) {
    return { success: false, message: 'Οι ενημερώσεις δεν είναι διαθέσιμες σε αυτή τη λειτουργία' }
  }

  if (updateDownloaded && downloadedVersion) {
    return {
      success: true,
      alreadyDownloaded: true,
      message: `Η έκδοση ${downloadedVersion} είναι ήδη έτοιμη για εγκατάσταση`
    }
  }

  if (downloading) {
    return { success: false, message: 'Η λήψη βρίσκεται ήδη σε εξέλιξη' }
  }

  downloading = true
  try {
    await autoUpdater.downloadUpdate()
    return { success: true, message: 'Η λήψη της ενημέρωσης ξεκίνησε' }
  } catch (err) {
    downloading = false
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Αποτυχία λήψης ενημέρωσης'
    }
  }
}

export function installUpdate(): { success: boolean; message: string } {
  if (!updatesAllowed()) {
    return { success: false, message: 'Διαθέσιμο μόνο στην εγκατεστημένη έκδοση' }
  }
  if (!updateDownloaded) {
    return {
      success: false,
      message: 'Δεν υπάρχει ληφθείσα ενημέρωση. Κάντε πρώτα λήψη.'
    }
  }
  try {
    // isSilent=false, isForceRunAfter=true — restart only after explicit user confirm.
    autoUpdater.quitAndInstall(false, true)
    return { success: true, message: 'Εγκατάσταση ενημέρωσης και επανεκκίνηση...' }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Αποτυχία εγκατάστασης'
    }
  }
}
