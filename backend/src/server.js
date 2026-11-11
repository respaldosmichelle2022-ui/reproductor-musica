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

// Ruta para devolver URLs de MP3 (asumiendo bucket público)
// Carpeta local de MP3 (se puede cambiar con MUSIC_DIR en .env)
const MUSIC_DIR = process.env.MUSIC_DIR || 'C:\\Users\\Cord_Contraloria\\Music\\MUSICA MP3';
app.use('/music', express.static(MUSIC_DIR));

app.get('/api/mp3', async (req, res) => {
  if (b2Activo()) {
    try {
      return res.json({ tracks: await pistasB2() });
    } catch (e) {
      console.error(e.message);
      return res.status(502).json({ error: 'No se pudo leer la musica de Backblaze' });
    }
  }
  const files = fs.readdirSync(MUSIC_DIR)
    .filter(f => f.toLowerCase().endsWith('.mp3'))
    .sort((a, b) => a.localeCompare(b));
  const base = process.env.MUSIC_BASE_URL || `${req.protocol}://${req.get('host')}/music`;
  res.json({ tracks: files.map(f => `${base}/${encodeURIComponent(f)}`) });
});

// Ruta para listar videos organizados por carpeta desde Backblaze
app.get('/api/videos', async (req, res) => {
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
  const scopes = encodeURIComponent('streaming user-read-email user-read-private');
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(process.env.SPOTIFY_REDIRECT_URI)}`;
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const basicAuth = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI
    })
  });
  const data = await response.json();
  if (!data.access_token) {
    return res.status(400).json({ error: 'Spotify no devolvio token', detalle: data });
  }
  // Volvemos a la pagina con el token en el hash (no queda en logs del servidor)
  const destino = process.env.FRONTEND_URL || (fs.existsSync(DIST) ? '/' : 'http://localhost:5173/');
  res.redirect(`${destino}#spotify_token=${encodeURIComponent(data.access_token)}`);
});

app.get('/api/spotify/search', async (req, res) => {
  const query = req.query.q;
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }
  const endpoint = `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(query)}`;
  const spResponse = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const spData = await spResponse.json();
  res.json(spData);
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

app.listen(PORT, () => {
  console.log(`⚡️ Backend escuchando en http://localhost:${PORT}`);
});

