// src/server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import { b2Activo, pistasB2, videosB2 } from './b2.js';
import path from 'path';
import crypto from 'crypto';
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

// Contraseña maestra y firma criptográfica para pases temporales de Mis Videos
const VIDEO_MASTER_PASS = process.env.VIDEO_MASTER_PASS || 'Y@mir8122';
const VIDEO_PASS_SECRET = process.env.VIDEO_PASS_SECRET || 'Yamir_Reproductor_Privado_Secret_2026';
const EPOCH_OFFSET_MIN = 29000000;

function obtenerDatosVideos() {
  if (fs.existsSync(VIDEOS_JSON)) {
    try {
      const data = JSON.parse(fs.readFileSync(VIDEOS_JSON, 'utf-8'));
      if (data && Array.isArray(data.videos)) return data;
    } catch (e) {
      console.error('Error leyendo videos.json:', e.message);
    }
  }
  return { carpetas: [], videos: [] };
}

function hashCarpeta(nombreCarpeta) {
  if (!nombreCarpeta || nombreCarpeta === 'TODAS') return '00';
  return crypto.createHash('md5').update(nombreCarpeta.trim().toUpperCase()).digest('hex').slice(0, 2).toUpperCase();
}

function generarPaseTemporal(carpeta = 'TODAS', minutos = 60) {
  const expMin = Math.floor(Date.now() / 60000) + Number(minutos);
  const timePart = (expMin - EPOCH_OFFSET_MIN).toString(36).toUpperCase();
  const folderTag = hashCarpeta(carpeta);
  const sig = crypto
    .createHmac('sha256', VIDEO_PASS_SECRET)
    .update(`${timePart}:${folderTag}`)
    .digest('hex')
    .slice(0, 4)
    .toUpperCase();
  return {
    codigo: `${timePart}${folderTag}-${sig}`,
    expiraEnMs: expMin * 60000
  };
}

function verificarPaseTemporal(codigoRaw, carpetaSolicitada) {
  const limpio = String(codigoRaw || '').trim().toUpperCase();
  const partes = limpio.split('-');
  if (partes.length !== 2) return null;
  const [izquierda, sig] = partes;
  if (izquierda.length < 4 || sig.length !== 4) return null;

  const timePart = izquierda.slice(0, -2);
  const folderTag = izquierda.slice(-2);
  const expectedSig = crypto
    .createHmac('sha256', VIDEO_PASS_SECRET)
    .update(`${timePart}:${folderTag}`)
    .digest('hex')
    .slice(0, 4)
    .toUpperCase();

  if (sig !== expectedSig) return null;

  const expMin = parseInt(timePart, 36) + EPOCH_OFFSET_MIN;
  if (Number.isNaN(expMin)) return null;

  const ahoraMin = Math.floor(Date.now() / 60000);
  if (ahoraMin > expMin) {
    return { expirado: true };
  }

  const tagSolicitado = hashCarpeta(carpetaSolicitada);
  if (folderTag !== '00' && folderTag !== tagSolicitado) {
    return { carpetaNoAutorizada: true };
  }

  return {
    valido: true,
    todasLasCarpetas: folderTag === '00',
    expiraEnMs: expMin * 60000
  };
}

// Ruta para listar únicamente las carpetas cerradas (sin exponer los videos hasta poner contraseña)
app.get('/api/videos', async (req, res) => {
  const data = obtenerDatosVideos();
  const conteoPorCarpeta = {};
  for (const v of data.videos) {
    const c = v.carpeta || 'General';
    conteoPorCarpeta[c] = (conteoPorCarpeta[c] || 0) + 1;
  }
  const carpetasUnicas = Object.keys(conteoPorCarpeta);
  const resumenCarpetas = carpetasUnicas.map(nombre => ({
    nombre,
    total: conteoPorCarpeta[nombre]
  }));

  res.json({
    protegido: true,
    carpetas: carpetasUnicas,
    resumenCarpetas,
    totalVideos: data.videos.length,
    videos: []
  });
});

// Ruta para desbloquear una carpeta con la contraseña maestra o con un pase temporal
app.post('/api/videos/desbloquear', (req, res) => {
  const { carpeta, clave } = req.body || {};
  const claveTrim = String(clave || '').trim();
  if (!claveTrim) {
    return res.status(400).json({ error: 'Ingresa la contraseña o pase temporal' });
  }

  const data = obtenerDatosVideos();

  // 1. Verificar si es la contraseña maestra
  if (claveTrim === VIDEO_MASTER_PASS) {
    return res.json({
      ok: true,
      esAdmin: true,
      todasLasCarpetas: true,
      expiraEnMs: null,
      videos: data.videos
    });
  }

  // 2. Verificar si es un pase temporal firmado
  const resultadoPase = verificarPaseTemporal(claveTrim, carpeta);
  if (!resultadoPase) {
    return res.status(401).json({ error: 'Contraseña o código temporal incorrecto' });
  }
  if (resultadoPase.expirado) {
    return res.status(401).json({ error: 'Este pase temporal ya caducó. Solicita uno nuevo.' });
  }
  if (resultadoPase.carpetaNoAutorizada) {
    return res.status(403).json({ error: 'Este pase temporal es válido únicamente para otra carpeta.' });
  }

  const videosPermitidos = resultadoPase.todasLasCarpetas
    ? data.videos
    : data.videos.filter(v => v.carpeta === carpeta);

  return res.json({
    ok: true,
    esAdmin: false,
    todasLasCarpetas: resultadoPase.todasLasCarpetas,
    expiraEnMs: resultadoPase.expiraEnMs,
    videos: videosPermitidos
  });
});

// Ruta para que el administrador genere un pase temporal desde su celular o PC
app.post('/api/videos/crear-pase', (req, res) => {
  const { claveAdmin, carpeta = 'TODAS', minutos = 60 } = req.body || {};
  if (String(claveAdmin || '').trim() !== VIDEO_MASTER_PASS) {
    return res.status(401).json({ error: 'Contraseña de administrador no válida' });
  }
  const mins = Math.max(5, Math.min(10080, Number(minutos) || 60));
  const { codigo, expiraEnMs } = generarPaseTemporal(carpeta, mins);
  return res.json({
    ok: true,
    codigo,
    expiraEnMs,
    minutos: mins,
    carpeta
  });
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

// Token automático del servidor para que TODOS los usuarios vean Spotify activo sin iniciar sesión
let spotifyServerToken = '';
let spotifyServerTokenExp = 0;
const cacheAudioSpotify = new Map();

async function obtenerTokenServidorSpotify() {
  if (spotifyServerToken && Date.now() < spotifyServerTokenExp) {
    return spotifyServerToken;
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID || '0e9c3e22485f403f9ec00c279b612630';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || 'fc3cc124f27444bba75f9f17a68812fa';
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });
  const data = await response.json();
  if (data && data.access_token) {
    spotifyServerToken = data.access_token;
    spotifyServerTokenExp = Date.now() + ((data.expires_in || 3600) - 120) * 1000;
    return spotifyServerToken;
  }
  throw new Error('No se pudo obtener token de Spotify del servidor');
}

app.get('/api/spotify/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.json({ tracks: { items: [] } });

  try {
    const token = req.query.token || (await obtenerTokenServidorSpotify());
    const endpoint = `https://api.spotify.com/v1/search?type=track&limit=15&q=${encodeURIComponent(query)}`;
    const spResponse = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const spData = await spResponse.json();
    if (spData?.tracks?.items) {
      return res.json(spData);
    }
  } catch (e) {
    console.warn('Fallback en /api/spotify/search:', e.message);
  }

  // Respaldo automático si Spotify tarda o falla
  try {
    const r = await ytSearch(query);
    const items = (r.videos || []).slice(0, 12).map(v => ({
      id: v.videoId,
      uri: `spotify:track:${v.videoId}`,
      name: v.title,
      duration_ms: (v.seconds || 210) * 1000,
      artists: [{ name: v.author?.name || 'Artista' }],
      album: {
        name: 'Spotify Streaming',
        images: [{ url: v.thumbnail || v.image }]
      },
      directVideoId: v.videoId
    }));
    return res.json({ tracks: { items } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Motor de audio multiusuario para Spotify (permite que varias personas escuchen canciones completas a la vez sin cortarse)
app.get('/api/spotify/audio', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.status(400).json({ error: 'Falta consulta de canción' });

  const key = query.toLowerCase();
  if (cacheAudioSpotify.has(key)) {
    return res.json(cacheAudioSpotify.get(key));
  }

  try {
    const r = await ytSearch(`${query} official audio`);
    const mejor = (r.videos && r.videos[0]) || null;
    if (!mejor) {
      return res.status(404).json({ error: 'No se encontró audio para esta canción' });
    }
    const payload = {
      videoId: mejor.videoId,
      titulo: mejor.title,
      duracionSeg: mejor.seconds || 0
    };
    cacheAudioSpotify.set(key, payload);
    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ error: e.message });
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
    const items = (r.videos || []).slice(0, 15).map(v => ({
      id: { videoId: v.videoId },
      snippet: {
        title: v.title,
        channelTitle: v.author?.name || 'YouTube',
        duration: v.timestamp || '',
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

