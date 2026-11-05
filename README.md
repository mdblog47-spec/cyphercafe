# PrintFlow ERP

Print shop ERP + private on-device file converter.  
React 19 + Vite + Tailwind 4, desktop app via Electron, licence via Google Apps Script.

## Folders

| Path | Kya hai |
| --- | --- |
| `src/` | App ka code (React) |
| `electron/` | Desktop app wrapper (Windows `.exe` ke liye) |
| `license-server/Code.gs` | Google Apps Script licence server (Google Sheet mein paste hota hai) |
| `.github/workflows/build-windows.yml` | GitHub pe automatically `.exe` banata hai |
| `build/icon.png` | Installer / app icon |

## Local run

```bash
npm install
npm run dev            # browser mein
npm run electron:start # desktop app window mein
```

## Windows installer (.exe) banana

GitHub pe: **Actions → Build Windows installer → Run workflow**, ya tag push karo:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Installer `PrintFlow-Setup-<version>.exe` workflow ke **Artifacts** mein (aur tag push par **Releases** mein) milega.

## Licence

1. `license-server/Code.gs` ko Google Sheet ke Apps Script mein deploy karo (steps file ke upar likhe hain).
2. Web app URL ko `src/license.ts` ke `LICENSE_API_URL` mein paste karo.

## Version badalna

`package.json` ka `"version"` badlo. App usi se version leta hai. Update notice ke liye Google Sheet ke `Config` tab mein `latest_version` bhi wahi daalo.

## Abhi included nahi

Supabase sync, customer QR upload page, silent auto-print, payment verification.
