// src/server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import { b2Activo, pistasB2, videosB2 } from './b2.js';
import path from 'path';
import { fileURLToPath } from 'url';
import ytSearch from 'yt-search';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../../frontend/dist');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

const TRACKS_JSON = path.resolve(__dirname, 'tracks.json');
const TITLES_JSON = path.resolve(__dirname, 'track_titles.json');
const DETALLE_JSON = path.resolve(__dirname, 'tracks_detalle.json');
const VIDEOS_JSON = path.resolve(__dirname, 'videos.json');

// Ruta para devolver URLs de MP3
// Carpeta local de MP3 (se puede cambiar con MUSIC_DIR en .env)
const MUSIC_DIR = process.env.MUSIC_DIR || 'C:\\PROYECTOS\\REPRODUCTOR DE MUSICA\\CANCIONES MP3';
app.use('/music', express.static(MUSIC_DIR));

app.get('/api/mp3', async (req, res) => {
  // 1. Prioridad: GitHub Releases (almacenamiento ilimitado y $0)
  if (fs.existsSync(TRACKS_JSON)) {
    try {
      const tracks = JSON.parse(fs.readFileSync(TRACKS_JSON, 'utf-8'));
      const titles = fs.existsSync(TITLES_JSON) ? JSON.parse(fs.readFileSync(TITLES_JSON, 'utf-8')) : {};
      let detalle = fs.existsSync(DETALLE_JSON) ? JSON.parse(fs.readFileSync(DETALLE_JSON, 'utf-8')) : [];
      if (!detalle || detalle.length === 0) {
        detalle = tracks.map(url => ({
          url,
          titulo: titles[url] || 'Canción',
          categoria: 'Colección Inicial'
        }));
      }
      const setCats = new Set(['Todas']);
      detalle.forEach(d => {
        if (d.categoria) setCats.add(d.categoria);
      });
      const categorias = Array.from(setCats);

      if (Array.isArray(tracks) && tracks.length > 0) {
        return res.json({ tracks, titles, categorias, tracksDetalle: detalle });
      }
    } catch (e) {
      console.error('Error leyendo tracks.json:', e.message);
    }
  }

  // 2. Si no hay tracks.json, intentar Backblaze
  if (b2Activo()) {
    try {
      return res.json({ tracks: await pistasB2() });
    } catch (e) {
      console.error(e.message);
      return res.status(502).json({ error: 'No se pudo leer la musica de Backblaze' });
    }
  }

  // 3. Fallback local
  if (fs.existsSync(MUSIC_DIR)) {
    const files = fs.readdirSync(MUSIC_DIR)
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .sort((a, b) => a.localeCompare(b));
    const base = process.env.MUSIC_BASE_URL || `${req.protocol}://${req.get('host')}/music`;
    return res.json({ tracks: files.map(f => `${base}/${encodeURIComponent(f)}`) });
  }

  res.json({ tracks: [] });
});

// Ruta para listar videos organizados por carpeta
app.get('/api/videos', async (req, res) => {
  // 1. Prioridad: GitHub Releases (almacenamiento ilimitado y $0)
  if (fs.existsSync(VIDEOS_JSON)) {
    try {
      const data = JSON.parse(fs.readFileSync(VIDEOS_JSON, 'utf-8'));
      if (data && data.videos && data.videos.length > 0) {
        return res.json(data);
      }
    } catch (e) {
      console.error('Error leyendo videos.json:', e.message);
    }
  }

  // 2. Si no hay videos.json, intentar Backblaze
  if (b2Activo()) {
    try {
      const data = await videosB2();
      return res.json(data);
    } catch (e) {
      console.error('Error al listar videos:', e.message);
      return res.status(502).json({ error: 'No se pudo leer los videos de Backblaze' });
    }
  }

  res.json({ carpetas: ['Todas'], videos: [] });
});

// ---------- Spotify ----------
app.get('/api/spotify/login', (req, res) => {
  const scopes = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' ');
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'https://reproductor-musica-sigma.vercel.app/callback';
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_CLIENT_ID}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&show_dialog=true`;
  res.redirect(authUrl);
});

app.get(['/callback', '/api/callback'], async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect('/#spotify_error=access_denied');
  }
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const basicAuth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'https://reproductor-musica-sigma.vercel.app/callback';
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    const data = await response.json();
    if (!data.access_token) {
      console.error('Spotify token error:', data);
      return res.status(400).send(`Error de Spotify: ${data.error_description || JSON.stringify(data)}`);
    }
    const destino = process.env.FRONTEND_URL || '/';
    res.redirect(`${destino}#spotify_token=${encodeURIComponent(data.access_token)}&refresh_token=${encodeURIComponent(data.refresh_token || '')}`);
  } catch (err) {
    console.error('Error en callback:', err);
    res.status(500).send('Error interno en autenticación Spotify');
  }
});

app.get('/api/spotify/refresh_token', async (req, res) => {
  const refreshToken = req.query.refresh_token;
  if (!refreshToken) return res.status(400).json({ error: 'Falta refresh_token' });
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const basicAuth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/spotify/search', async (req, res) => {
  const query = req.query.q;
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }
  try {
    const endpoint = `https://api.spotify.com/v1/search?type=track,album,playlist&limit=12&q=${encodeURIComponent(query)}`;
    const spResponse = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const spData = await spResponse.json();
    res.json(spData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- YouTube ----------
app.get('/api/youtube/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ items: [] });

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${apiKey}`;
      const ytResponse = await fetch(endpoint);
      const ytData = await ytResponse.json();
      return res.json(ytData);
    }

    // Si no hay API key configurada, busca directamente sin requerir credenciales
    const r = await ytSearch(query);
    const items = (r.videos || []).slice(0, 10).map(v => ({
      id: { videoId: v.videoId },
      snippet: {
        title: v.title,
        thumbnails: {
          default: { url: v.thumbnail || v.image }
        }
      }
    }));
    res.json({ items });
  } catch (err) {
    console.error('Error buscando en YouTube:', err.message);
    res.status(500).json({ error: 'Error al buscar en YouTube' });
  }
});

// Sirve la página ya compilada (frontend/dist) si existe
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`⚡️ Backend escuchando en http://localhost:${PORT}`);
  });
}

export default app;

