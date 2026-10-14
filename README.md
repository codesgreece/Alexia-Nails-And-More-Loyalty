# Angel Nails Club

Τοπική εφαρμογή πιστότητας Windows για **Angel Nails & More**.

## Τεχνολογίες

- Electron + React + TypeScript + Vite (`electron-vite`)
- SQLite μέσω `sql.js` (WASM) με μόνιμο αρχείο στη διαδρομή `userData` — χωρίς native compilation στο μηχάνημα του σαλονιού
- Ελληνικό UI
- Electron Builder (NSIS installer)
- GitHub Releases updates (`electron-updater`)

## Πολιτική πόντων

Κάθε **€1** δαπάνης = **1 πόντος**. Τα κλασματικά ευρώ στρογγυλοποιούνται προς τα κάτω (`€35,50 → 35`). Τα ποσά αποθηκεύονται σε λεπτά (ακέραιοι).

Ανταμοιβή παραπομπής: **80%** στην παραπέμπουσα / **20%** στη νέα πελάτισσα (το υπόλοιπο της διαίρεσης πάει στην παραπέμπουσα). Ενεργοποιείται στην **πρώτη επιλέξιμη αγορά**, μόνο αν έχει ρυθμιστεί ποσό ανταμοιβής.

## Ανάπτυξη

```bash
npm install
npm run dev
```

## Έλεγχοι

```bash
npm test
npm run typecheck
```

## Production build (Windows) — χωρίς publish

```bash
npm run dist
```

ή χειροκίνητα:

```bash
npm run build
set CSC_IDENTITY_AUTO_DISCOVERY=false
npx electron-builder --win --publish never
```

Το installer δημιουργείται στο `release/`:

- `Angel-Nails-Club-<version>-Setup.exe`
- `Angel-Nails-Club-<version>-Setup.exe.blockmap`
- `latest.yml`

Σημείωση: σε ορισμένα Windows χωρίς Developer Mode, το electron-builder μπορεί να αποτύχει στο `winCodeSign` λόγω συμβολικών συνδέσμων. Η ρύθμιση `signAndEditExecutable: false` και `CSC_IDENTITY_AUTO_DISCOVERY=false` παρακάμπτει την υπογραφή για τοπικά builds.

## Βάση δεδομένων (διατηρείται στις ενημερώσεις)

Η βάση **δεν** βρίσκεται στον φάκελο εγκατάστασης. Αποθηκεύεται σε:

`%APPDATA%\angel-nails-club\Angel Nails Club\angel-nails-club.db`

Οι ενημερώσεις αντικαθιστούν μόνο τα αρχεία της εφαρμογής. Πελάτισσες, πόντοι, αγορές, παραπομπές, ανταμοιβές και ρυθμίσεις παραμένουν.

## GitHub Releases & Auto-Updates

Αποθετήριο: [codesgreece/Alexia-Nails-And-More-Loyalty](https://github.com/codesgreece/Alexia-Nails-And-More-Loyalty)

Releases: https://github.com/codesgreece/Alexia-Nails-And-More-Loyalty/releases

### Απαιτούμενα assets ανά release

Κάθε GitHub Release πρέπει να περιλαμβάνει τουλάχιστον:

1. `Angel-Nails-Club-<version>-Setup.exe`
2. `Angel-Nails-Club-<version>-Setup.exe.blockmap`
3. `latest.yml` (πρέπει να δείχνει στο ίδιο όνομα installer)

Μην ανεβάζετε `node_modules`, source, τοπικές βάσεις ή secrets.

### Token (GH_TOKEN)

Για **δημοσίευση** release από το μηχάνημα build:

1. Δημιουργήστε GitHub Personal Access Token με δικαίωμα `repo` (για ιδιωτικό αποθετήριο) ή `public_repo` (αν είναι δημόσιο).
2. Ορίστε το ως μεταβλητή περιβάλλοντος — **ποτέ** μέσα στον κώδικα:

```powershell
$env:GH_TOKEN = "ghp_..."
```

Το token **δεν** μπαίνει στην εγκατεστημένη εφαρμογή. Για να λειτουργεί ο αυτόματος έλεγχος ενημερώσεων χωρίς token στο client, τα release assets πρέπει να είναι **δημόσια προσβάσιμα** (δημόσιο repo ή public releases).

### Πρώτο release (v1.0.0)

1. Επιβεβαιώστε στο `package.json`: `"version": "1.0.0"`.
2. Build + publish:

```powershell
$env:GH_TOKEN = "ghp_..."
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist:publish
```

Αυτό δημιουργεί GitHub Release `v1.0.0` με installer, blockmap και `latest.yml`.

Εναλλακτικά (μόνο build, χειροκίνητο upload):

```bash
npm run dist
```

και ανεβάστε χειροκίνητα τα τρία assets στο https://github.com/codesgreece/Alexia-Nails-And-More-Loyalty/releases/new με tag `v1.0.0`.

### Επόμενα releases (π.χ. v1.0.1)

1. Αλλάξτε `"version"` στο `package.json` σε `1.0.1` (ή νεότερη).
2. Τρέξτε ξανά:

```powershell
$env:GH_TOKEN = "ghp_..."
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist:publish
```

### npm scripts

| Script | Τι κάνει |
|--------|----------|
| `npm run dist` | Build installer, **χωρίς** publish |
| `npm run dist:publish` | Build + publish στο GitHub Releases |
| `npm run dist:dir` | Unpacked dir build, χωρίς publish |

### Ασφαλές δοκιμή ενημερώσεων

1. Δημοσιεύστε `v1.0.0` και εγκαταστήστε το σε δοκιμαστικό PC.
2. Ανεβάστε `v1.0.1` με `npm run dist:publish`.
3. Στην εγκατεστημένη `1.0.0`: Ρυθμίσεις → Έλεγχος ενημερώσεων → Λήψη → επιβεβαίωση Εγκατάσταση.
4. Επιβεβαιώστε ότι η βάση στο `%APPDATA%` παραμένει και οι πελάτισσες φαίνονται.
5. Offline: αποσυνδέστε το δίκτυο και επιβεβαιώστε ότι η εφαρμογή ανοίγει κανονικά· ο έλεγχος ενημερώσεων εμφανίζει μήνυμα αδυναμίας χωρίς crash.

Στο development (`npm run dev`) ο έλεγχος ενημερώσεων είναι απενεργοποιημένος. Για εξαίρεση δοκιμής: `ANGEL_NAILS_FORCE_UPDATES=1`.

## Δομή

- `src/main` — Electron main, SQLite, υπηρεσίες, IPC, updater
- `src/preload` — ασφαλές bridge
- `src/renderer` — React UI (Ελληνικά)
- `src/shared` — τύποι, κανόνες πόντων, IPC channels
- `tests` — κρίσιμοι επιχειρηματικοί κανόνες
- `build/` — icons για installer / exe
