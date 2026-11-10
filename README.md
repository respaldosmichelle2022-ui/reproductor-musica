# Reproductor de Música

Página web que reproduce tus MP3 y está preparada para buscar en YouTube y Spotify.

## Estructura
- `backend/`: servidor Node/Express. Lista y sirve los MP3, y hace de intermediario con YouTube y Spotify.
- `frontend/`: página React + Vite (reproductor, lista, filtro, anterior/siguiente).
- `subir-a-backblaze.ps1`: sube tus MP3 a Backblaze B2 (plan gratis, 10 GB).
- `subir-a-la-nube.ps1`: alternativa para Google Cloud Storage (requiere facturación).

## Ejecutar en local
Abre dos terminales de PowerShell:

```powershell
# Terminal 1: servidor (http://localhost:8080)
cd "c:\PROYECTOS\REPRODUCTOR DE MUSICA\music-player\backend"
npm run dev

# Terminal 2: página (http://localhost:5173)
cd "c:\PROYECTOS\REPRODUCTOR DE MUSICA\music-player\frontend"
npm run dev
```

El servidor lee los MP3 de `C:\Users\Cord_Contraloria\Music\MUSICA MP3`. Puedes cambiar la carpeta con `MUSIC_DIR` en `backend\.env`.

## Usar la música desde la nube (Backblaze B2)
1. Crea un bucket **público** y una llave de aplicación en backblaze.com.
2. Sube la música:
   ```powershell
   cd "c:\PROYECTOS\REPRODUCTOR DE MUSICA\music-player"
   powershell -ExecutionPolicy Bypass -File .\subir-a-backblaze.ps1 -KeyId "KEYID" -AppKey "APPLICATIONKEY" -Bucket "BUCKET"
   ```
3. En `backend\.env` agrega `MUSIC_BASE_URL` con la dirección pública de la carpeta `musica` de tu bucket.
4. Reinicia el servidor.

## Claves pendientes (`backend\.env`, copia de `.env.example`)
- `YOUTUBE_API_KEY`: para buscar en YouTube.
- `SPOTIFY_CLIENT_ID` y `SPOTIFY_CLIENT_SECRET`: para Spotify. Reproducir canciones completas requiere cuenta Premium.

Nunca compartas ni subas a un repositorio el archivo `.env` ni las llaves.

