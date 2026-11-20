// src/server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import https from 'https';
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
const cacheYouTubeSearch = new Map();
const cacheYouTubeRadio = new Map();
const cacheSpotifySearch = new Map();

function guardarEnCache(mapa, clave, datos, maxItems = 150) {
  if (mapa.size >= maxItems) {
    const primeraClave = mapa.keys().next().value;
    mapa.delete(primeraClave);
  }
  mapa.set(clave, { datos, tiempo: Date.now() });
}

function obtenerDeCache(mapa, clave, ttlMs = 25 * 60 * 1000) {
  const item = mapa.get(clave);
  if (!item) return null;
  if (Date.now() - item.tiempo > ttlMs) {
    mapa.delete(clave);
    return null;
  }
  return item.datos;
}

async function obtenerTokenServidorSpotify() {
  if (spotifyServerToken && Date.now() < spotifyServerTokenExp) {
    return spotifyServerToken;
  }
  const clientId = (process.env.SPOTIFY_CLIENT_ID || '0e9c3e22485f403f9ec00c279b612630').trim();
  const clientSecret = (process.env.SPOTIFY_CLIENT_SECRET || 'fc3cc124f27444bba75f9f17a68812fa').trim();
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

  const cacheKey = query.toLowerCase();
  const cached = obtenerDeCache(cacheSpotifySearch, cacheKey);
  if (cached) return res.json(cached);

  try {
    const token = req.query.token || (await obtenerTokenServidorSpotify());
    const endpoint = `https://api.spotify.com/v1/search?type=track&limit=15&q=${encodeURIComponent(query)}`;
    const spResponse = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const spData = await spResponse.json();
    if (spData?.tracks?.items) {
      guardarEnCache(cacheSpotifySearch, cacheKey, spData);
      return res.json(spData);
    }
  } catch (e) {
    console.warn('Fallback en /api/spotify/search:', e.message);
  }

  // Respaldo automático si Spotify tarda o falla
  try {
    const r = await ytSearch(query);
    const items = (r.videos || []).slice(0, 15).map(v => ({
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
    const payload = { tracks: { items } };
    guardarEnCache(cacheSpotifySearch, cacheKey, payload);
    return res.json(payload);
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

// Endpoint para Radio de Sugerencias y Artistas Similares en Spotify
app.get('/api/spotify/radio', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const artist = String(req.query.artist || '').trim();
  const title = String(req.query.title || '').trim();

  if (!query && !artist && !title) return res.json({ tracks: { items: [] } });

  const cacheKey = `sp_radio__${query}__${artist}__${title}`.toLowerCase();
  const cached = obtenerDeCache(cacheSpotifySearch, cacheKey);
  if (cached) return res.json(cached);

  try {
    const qMix = `${artist || query} canciones similares grandes exitos`.trim();
    const rSearch = await ytSearch(qMix);
    const bestVid = rSearch.videos?.[0];
    let items = [];

    if (bestVid?.videoId) {
      const mixData = await fetchYouTubeMix(bestVid.videoId);
      if (mixData.items && mixData.items.length > 0) {
        items = mixData.items.map(v => ({
          id: v.id?.videoId,
          uri: `spotify:track:${v.id?.videoId}`,
          name: v.snippet?.title || 'Canción',
          duration_ms: 210000,
          artists: [{ name: v.snippet?.channelTitle || 'Artista' }],
          album: {
            name: mixData.mixTitle || 'Spotify Radio Mix',
            images: [{ url: v.snippet?.thumbnails?.default?.url }]
          },
          directVideoId: v.id?.videoId
        }));
      }
    }

    if (items.length === 0 && rSearch.videos) {
      items = rSearch.videos.slice(0, 15).map(v => ({
        id: v.videoId,
        uri: `spotify:track:${v.videoId}`,
        name: v.title,
        duration_ms: (v.seconds || 210) * 1000,
        artists: [{ name: v.author?.name || 'Artista' }],
        album: {
          name: 'Spotify Radio Mix',
          images: [{ url: v.thumbnail || v.image }]
        },
        directVideoId: v.videoId
      }));
    }

    const payload = { tracks: { items } };
    guardarEnCache(cacheSpotifySearch, cacheKey, payload);
    return res.json(payload);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Patrones estrictos para descartar audiolibros, autoayuda, conferencias, podcasts y contenido no musical
const PATRONES_NO_MUSICALES = [
  /audiolibro/i,
  /audio\s*libro/i,
  /audiobook/i,
  /audio\s*book/i,
  /resumen\s+de(l)?\s+libro/i,
  /resumen\s+animado/i,
  /libro\s+completo/i,
  /cap[ií]tulo\s*\d+/i,
  /psicolog[ií]a/i,
  /maquiavelo/i,
  /maquiav[eé]lic/i,
  /robert\s+greene/i,
  /48\s+leyes/i,
  /leyes\s+del\s+poder/i,
  /podcast/i,
  /episodio\s*\d+/i,
  /conferencia/i,
  /ted\s*talk/i,
  /tedx/i,
  /tutorial/i,
  /curso\s+completo/i,
  /clase\s+de/i,
  /c[oó]mo\s+(hacer|atraer|conquistar|seducir|controlar|volverte|actuar|hablar|ganar|enamorar)/i,
  /arte\s+de\s+(generar|la\s+seducci[oó]n|la\s+guerra|enamorar|manipular|persuadir)/i,
  /t[eé]cnicas\s+de\s+(seducci[oó]n|persuasi[oó]n|manipulaci[oó]n)/i,
  /lenguaje\s+corporal/i,
  /documental/i,
  /documentary/i,
  /noticias/i,
  /noticiero/i,
  /breaking\s+news/i,
  /gameplay/i,
  /walkthrough/i,
  /playthrough/i,
  /meditaci[oó]n\s+guiada/i,
  /afirmaciones\s+positivas/i,
  /afirmaciones/i,
  /hipnosis/i,
  /deja\s+de\s+perseguir/i,
  /ha(z|cer?)\s+que\s+(cualquier\s+mujer|alguien|los\s+dem[aá]s|un\s+hombre|te\s+extra[ñn]e|se\s+obsesione)/i,
  /obsesionen\s+mentalmente/i,
  /obsesione/i,
  /error\s+invisible/i,
  /perder\s+atracci[oó]n/i,
  /s[eé]\s+el\s+estratega/i,
  /persuasi[oó]n/i,
  /h[aá]bitos\s+at[oó]micos/i,
  /superaci[oó]n\s+personal/i,
  /autoayuda/i,
  /crecimiento\s+personal/i,
  /desarrollo\s+personal/i,
  /estoic/i,
  /hombre\s+de\s+alto\s+valor/i,
  /macho\s+alfa/i,
  /mente\s+subconsciente/i,
  /ley\s+de\s+atracci[oó]n/i,
  /reacci[oó]n\s+a\s+/i
];

function esContenidoMusical(title = '', channel = '', seconds = 0, timestamp = '') {
  const texto = `${title} ${channel}`.toLowerCase();
  for (const patron of PATRONES_NO_MUSICALES) {
    if (patron.test(texto)) return false;
  }
  let seg = Number(seconds) || 0;
  if (!seg && timestamp && timestamp.includes(':')) {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 3) seg = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) seg = parts[0] * 60 + parts[1];
  }
  if (seg > 1500) {
    const esMixOAlbum = /\b(mix|remix|dj|set|sesi[oó]n|session|album|disco|concierto|concert|live|en vivo|megamix)\b/i.test(texto);
    if (!esMixOAlbum) return false;
  }
  return true;
}

// ---------- YouTube ----------
app.get('/api/youtube/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.json({ items: [] });

  const cacheKey = query.toLowerCase();
  const cached = obtenerDeCache(cacheYouTubeSearch, cacheKey);
  if (cached) return res.json(cached);

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(query)}&key=${apiKey}`;
      const ytResponse = await fetch(endpoint);
      const ytData = await ytResponse.json();
      if (ytData?.items) {
        const items = (ytData.items || []).filter(v =>
          esContenidoMusical(v.snippet?.title, v.snippet?.channelTitle)
        );
        const payload = { items };
        guardarEnCache(cacheYouTubeSearch, cacheKey, payload);
        return res.json(payload);
      }
    }

    // Asegurar que la búsqueda tenga intención musical para evitar libros/audios de autoayuda
    const tieneTerminoMusical = /\b(cancion|canciones|musica|music|song|songs|video|official|oficial|audio|lyrics|letra|album|disco|remix|live|en vivo|mix|vevo|ft|feat|banda|grupo|orquesta|dj)\b/i.test(query);
    const queryBusqueda = tieneTerminoMusical ? query : `${query} cancion`;

    const r = await ytSearch(queryBusqueda);
    let items = (r.videos || [])
      .filter(v => esContenidoMusical(v.title, v.author?.name, v.seconds, v.timestamp))
      .slice(0, 18)
      .map(v => ({
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

    // Si con 'cancion' trajo pocos resultados, buscar también directo y filtrar estrictamente
    if (items.length < 4 && !tieneTerminoMusical) {
      const r2 = await ytSearch(query);
      const items2 = (r2.videos || [])
        .filter(v => esContenidoMusical(v.title, v.author?.name, v.seconds, v.timestamp))
        .slice(0, 18)
        .map(v => ({
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
      if (items2.length > items.length) {
        items = items2;
      }
    }

    const payload = { items };
    guardarEnCache(cacheYouTubeSearch, cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('Error buscando en YouTube:', err.message);
    res.status(500).json({ error: 'Error al buscar en YouTube' });
  }
});

// Helper para extraer ytInitialData de páginas de YouTube de forma segura
function extraerInitialDataYouTube(html) {
  const startPatterns = ['var ytInitialData = ', 'ytInitialData = '];
  let startIdx = -1;
  for (const p of startPatterns) {
    const idx = html.indexOf(p);
    if (idx !== -1) {
      startIdx = idx + p.length;
      break;
    }
  }
  if (startIdx === -1) return null;
  const endIdx = html.indexOf(';</script>', startIdx);
  if (endIdx === -1) return null;
  try {
    return JSON.parse(html.slice(startIdx, endIdx));
  } catch (e) {
    return null;
  }
}

// Obtiene la Radio / Mix oficial de YouTube (RD) con canciones y otros artistas recomendados
function fetchYouTubeMix(videoId) {
  return new Promise(resolve => {
    if (!videoId) return resolve({ mixTitle: '', items: [] });
    const url = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
    https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
        }
      },
      res => {
        let body = '';
        res.on('data', c => (body += c));
        res.on('end', () => {
          try {
            const data = extraerInitialDataYouTube(body);
            const pl = data?.contents?.twoColumnWatchNextResults?.playlist?.playlist;
            const contents = pl?.contents || [];
            const items = [];
            const vistos = new Set();

            for (const it of contents) {
              const p = it.playlistPanelVideoRenderer;
              if (!p || !p.videoId || vistos.has(p.videoId)) continue;
              const title = p.title?.simpleText || p.title?.runs?.[0]?.text || '';
              const channelTitle =
                p.shortBylineText?.runs?.[0]?.text ||
                p.longBylineText?.runs?.[0]?.text ||
                'YouTube';
              const duration = p.lengthText?.simpleText || '';

              // Descartar audiolibros, autoayuda o contenido no musical
              if (!esContenidoMusical(title, channelTitle, 0, duration)) continue;

              vistos.add(p.videoId);
              const thumb =
                p.thumbnail?.thumbnails?.[p.thumbnail.thumbnails.length - 1]?.url ||
                p.thumbnail?.thumbnails?.[0]?.url ||
                `https://i.ytimg.com/vi/${p.videoId}/hqdefault.jpg`;

              items.push({
                id: { videoId: p.videoId },
                snippet: {
                  title,
                  channelTitle,
                  duration,
                  thumbnails: {
                    default: { url: thumb }
                  }
                }
              });
            }

            // Si el playlist RD no devolvió suficientes items, extraer de secondaryResults (videos relacionados)
            if (items.length < 5 && data?.contents?.twoColumnWatchNextResults) {
              const secResults =
                data.contents.twoColumnWatchNextResults.secondaryResults?.secondaryResults?.results ||
                data.contents.twoColumnWatchNextResults.secondaryResults?.results ||
                [];
              for (const s of secResults) {
                const section = s.itemSectionRenderer?.contents || [s];
                for (const entry of section) {
                  if (entry.compactVideoRenderer) {
                    const c = entry.compactVideoRenderer;
                    if (!c.videoId || vistos.has(c.videoId)) continue;
                    const title = c.title?.simpleText || c.title?.runs?.[0]?.text || '';
                    const channelTitle = c.shortBylineText?.runs?.[0]?.text || 'YouTube';
                    const duration = c.lengthText?.simpleText || '';
                    if (!esContenidoMusical(title, channelTitle, 0, duration)) continue;
                    vistos.add(c.videoId);
                    items.push({
                      id: { videoId: c.videoId },
                      snippet: {
                        title,
                        channelTitle,
                        duration,
                        thumbnails: {
                          default: {
                            url:
                              c.thumbnail?.thumbnails?.[0]?.url ||
                              `https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg`
                          }
                        }
                      }
                    });
                  } else if (entry.lockupViewModel) {
                    const lock = entry.lockupViewModel;
                    const id =
                      lock.contentImage?.thumbnailViewModel?.overlays?.[0]
                        ?.thumbnailBottomOverlayViewModel?.animationActivationTargetId ||
                      lock.rendererContext?.commandContext?.onTap?.innertubeCommand
                        ?.watchEndpoint?.videoId;
                    if (!id || vistos.has(id)) continue;
                    const title = lock.metadata?.lockupMetadataViewModel?.title?.content || '';
                    const ch =
                      lock.metadata?.lockupMetadataViewModel?.metadata
                        ?.contentMetadataViewModel?.metadataRows?.[0]?.parts?.[0]?.text ||
                      'YouTube';
                    if (!esContenidoMusical(title, ch)) continue;
                    vistos.add(id);
                    const thumb =
                      lock.contentImage?.thumbnailViewModel?.image?.sources?.[0]?.url ||
                      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
                    items.push({
                      id: { videoId: id },
                      snippet: {
                        title,
                        channelTitle: ch,
                        duration: '',
                        thumbnails: { default: { url: thumb } }
                      }
                    });
                  }
                }
              }
            }

            resolve({
              mixTitle: pl?.title || 'Mix de Artistas Similares',
              items
            });
          } catch (e) {
            resolve({ mixTitle: '', items: [] });
          }
        });
      }
    ).on('error', () => resolve({ mixTitle: '', items: [] }));
  });
}

// Endpoint exclusivo para Radio de Sugerencias y Coincidencias de YouTube
// Soporta modo 'mix' (artistas y canciones similares de YouTube) y modo 'artist' (éxitos del artista)
app.get('/api/youtube/radio', async (req, res) => {
  const videoId = String(req.query.videoId || '').trim();
  const currentTitle = String(req.query.title || '').trim();
  const artistParam = String(req.query.artist || '').trim();
  const query = String(req.query.q || '').trim();
  const mode = String(req.query.mode || 'mix').toLowerCase(); // 'mix' | 'artist'
  const excludeId = String(req.query.excludeId || '').trim();

  if (!videoId && !query && !currentTitle) return res.json({ items: [], mixTitle: '' });

  const cacheKey = `${mode}__${videoId}__${currentTitle}__${artistParam}__${query}`.toLowerCase();
  const cached = obtenerDeCache(cacheYouTubeRadio, cacheKey);
  if (cached) return res.json(cached);

  try {
    // Detectar artista limpio
    let artista = artistParam;
    let temaCancion = currentTitle;

    if (!artista && currentTitle) {
      const partes = currentTitle.split(/[-–—:]/);
      if (partes.length > 1) {
        artista = partes[0].trim();
        temaCancion = partes.slice(1).join(' ').trim();
      }
    }
    if (!artista) artista = query;

    // 1. MODO MIX DE YOUTUBE: Descubrimiento de OTROS ARTISTAS Y CANCIONES AFINES
    if (mode === 'mix') {
      let mixResult = { mixTitle: '', items: [] };

      // Si tenemos el videoId, obtenemos directamente la Radio Mix oficial de YouTube (RD)
      if (videoId) {
        mixResult = await fetchYouTubeMix(videoId);
      }

      // Si no hubo videoId o trajo pocos resultados, buscar el video en YouTube para obtener su Mix
      if (!mixResult.items || mixResult.items.length < 5) {
        const queryBusq = `${artista || ''} ${temaCancion || query}`.trim();
        const rSearch = await ytSearch(queryBusq);
        const bestVid = rSearch.videos?.[0];
        if (bestVid?.videoId && bestVid.videoId !== videoId) {
          mixResult = await fetchYouTubeMix(bestVid.videoId);
        }
      }

      // Respaldo inteligente si YouTube no genera RD
      if (!mixResult.items || mixResult.items.length < 5) {
        const busquedaMix = `${artista || ''} canciones similares mix exitos`.trim();
        const rFallback = await ytSearch(busquedaMix);
        const itemsFallback = (rFallback.videos || [])
          .filter(v => esContenidoMusical(v.title, v.author?.name, v.seconds, v.timestamp))
          .slice(0, 20)
          .map(v => ({
            id: { videoId: v.videoId },
            snippet: {
              title: v.title,
              channelTitle: v.author?.name || 'YouTube',
              duration: v.timestamp || '',
              thumbnails: { default: { url: v.thumbnail || v.image } }
            }
          }));
        mixResult = {
          mixTitle: `Mix de Canciones y Artistas Similares`,
          items: itemsFallback
        };
      }

      const payload = {
        mixTitle: mixResult.mixTitle || `Mix de canciones similares`,
        items: mixResult.items
      };
      guardarEnCache(cacheYouTubeRadio, cacheKey, payload);
      return res.json(payload);
    }

    // 2. MODO DEL MISMO ARTISTA: Grandes éxitos de este artista
    const busquedaArtista = `${artista} canciones grandes exitos`.trim();
    const r = await ytSearch(busquedaArtista);
    const vistos = new Set();
    if (excludeId) vistos.add(excludeId);

    const items = [];
    for (const v of r.videos || []) {
      if (!v.videoId || vistos.has(v.videoId)) continue;
      if (!esContenidoMusical(v.title, v.author?.name, v.seconds, v.timestamp)) continue;
      const claveTitulo = v.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 22);
      if (vistos.has(claveTitulo)) continue;
      vistos.add(v.videoId);
      vistos.add(claveTitulo);

      items.push({
        id: { videoId: v.videoId },
        snippet: {
          title: v.title,
          channelTitle: v.author?.name || 'YouTube',
          duration: v.timestamp || '',
          thumbnails: { default: { url: v.thumbnail || v.image } }
        }
      });
      if (items.length >= 20) break;
    }

    const payload = {
      mixTitle: `Grandes éxitos de ${artista}`,
      items
    };
    guardarEnCache(cacheYouTubeRadio, cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.error('Error generando Radio de YouTube:', err.message);
    res.status(500).json({ error: 'Error al generar radio de sugerencias' });
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

