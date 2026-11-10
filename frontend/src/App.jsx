import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';

const API = import.meta.env.DEV ? 'http://localhost:8080' : '';

export default function App() {
  const [tab, setTab] = useState('cloud'); // 'cloud' | 'youtube' | 'spotify' | 'favorites'
  const [mp3Tracks, setMp3Tracks] = useState([]);
  const [spotifyTracks, setSpotifyTracks] = useState([]);
  const [ytVideos, setYtVideos] = useState([]);
  const [search, setSearch] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState('');
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState('');
  const [spotifyInput, setSpotifyInput] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);
  const [current, setCurrent] = useState('');
  const [filtro, setFiltro] = useState('');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Favoritos guardados en localStorage
  const [favoritos, setFavoritos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mp3_favoritos') || '[]');
    } catch {
      return [];
    }
  });

  const audioRef = useRef(null);

  const nombre = url => {
    const sinParametros = url.split('?')[0];
    return decodeURIComponent(sinParametros.split('/').pop()).replace(/\.mp3$/i, '');
  };

  const toggleFavorito = (url, e) => {
    e.stopPropagation();
    let nuevos;
    if (favoritos.includes(url)) {
      nuevos = favoritos.filter(f => f !== url);
    } else {
      nuevos = [...favoritos, url];
    }
    setFavoritos(nuevos);
    localStorage.setItem('mp3_favoritos', JSON.stringify(nuevos));
  };

  const listaActual = tab === 'favorites' ? favoritos : mp3Tracks;
  const visibles = listaActual.filter(u => nombre(u).toLowerCase().includes(filtro.toLowerCase()));

  const mover = d => {
    if (!visibles.length) return;
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }
    if (isShuffle) {
      const azar = Math.floor(Math.random() * visibles.length);
      reproducirMP3(visibles[azar]);
      return;
    }
    const i = visibles.indexOf(current);
    const siguiente = visibles[(i + d + visibles.length) % visibles.length];
    reproducirMP3(siguiente);
  };

  const reproducirMP3 = url => {
    setCurrent(url);
    setCurrentVideo(null); // Detener YouTube
  };

  const reproducirYouTube = videoId => {
    setCurrentVideo(videoId);
    if (audioRef.current) {
      audioRef.current.pause(); // Pausar MP3
    }
  };

  const cargarEnlaceSpotify = () => {
    if (!spotifyInput.trim()) return;
    // Convierte links de open.spotify.com a embed
    const match = spotifyInput.match(/spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
    if (match) {
      const tipo = match[1];
      const id = match[2];
      setSpotifyEmbedUrl(`https://open.spotify.com/embed/${tipo}/${id}?utm_source=generator&theme=0`);
      if (audioRef.current) audioRef.current.pause();
      setCurrentVideo(null);
    } else {
      alert('Por favor introduce un enlace válido de Spotify (ejemplo: https://open.spotify.com/track/...)');
    }
  };

  useEffect(() => {
    const m = window.location.hash.match(/spotify_token=([^&]+)/);
    if (m) {
      setSpotifyToken(decodeURIComponent(m[1]));
      setTab('spotify');
      window.history.replaceState(null, '', window.location.pathname);
    }
    axios.get(`${API}/api/mp3`)
      .then(r => setMp3Tracks(r.data.tracks || []))
      .catch(console.error);
  }, []);

  const buscar = async () => {
    if (!search.trim()) return;
    setBuscando(true);

    try {
      const yt = await axios.get(`${API}/api/youtube/search`, { params: { q: search } });
      setYtVideos(yt.data.items || []);
      setTab('youtube');
    } catch (e) {
      console.error(e);
    }

    if (spotifyToken) {
      try {
        const sp = await axios.get(`${API}/api/spotify/search`, { params: { q: search, token: spotifyToken } });
        setSpotifyTracks(sp.data.tracks?.items || []);
      } catch (e) {
        console.error(e);
      }
    }
    setBuscando(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎵 Reproductor de Música</h1>
        <div className="search-bar">
          <input
            placeholder="Buscar artista, canción o video..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
          />
          <button className="btn-primary" onClick={buscar} disabled={buscando}>
            {buscando ? 'Buscando...' : '🔍 Buscar'}
          </button>
        </div>

        <nav className="tab-nav">
          <button
            className={`tab-btn ${tab === 'cloud' ? 'active' : ''}`}
            onClick={() => setTab('cloud')}
          >
            ☁️ Mi Nube ({mp3Tracks.length})
          </button>
          <button
            className={`tab-btn ${tab === 'favorites' ? 'active' : ''}`}
            onClick={() => setTab('favorites')}
          >
            ❤️ Favoritas ({favoritos.length})
          </button>
          <button
            className={`tab-btn ${tab === 'youtube' ? 'active' : ''}`}
            onClick={() => setTab('youtube')}
          >
            ▶ YouTube {ytVideos.length > 0 && `(${ytVideos.length})`}
          </button>
          <button
            className={`tab-btn ${tab === 'spotify' ? 'active' : ''}`}
            onClick={() => setTab('spotify')}
          >
            🟢 Spotify
          </button>
        </nav>
      </header>

      {/* REPRODUCTOR DE MP3 FLOTANTE */}
      {current && (
        <div className="floating-player">
          <div className="player-track-info">
            <span className="player-icon">🎵</span>
            <div className="player-text">
              <span className="player-status">Reproduciendo ahora:</span>
              <strong>{nombre(current)}</strong>
            </div>
            <button
              className="btn-heart"
              onClick={e => toggleFavorito(current, e)}
              title="Guardar en favoritos"
            >
              {favoritos.includes(current) ? '❤️' : '🤍'}
            </button>
          </div>

          <audio
            ref={audioRef}
            controls
            autoPlay
            src={current}
            onEnded={() => mover(1)}
          />

          <div className="player-controls">
            <button className="btn-control" onClick={() => mover(-1)}>⏮ Anterior</button>
            <button className="btn-control" onClick={() => mover(1)}>Siguiente ⏭</button>
            <button
              className={`btn-control ${isShuffle ? 'active-toggle' : ''}`}
              onClick={() => setIsShuffle(!isShuffle)}
              title="Reproducción aleatoria"
            >
              🔀 {isShuffle ? 'Aleatorio ON' : 'Aleatorio'}
            </button>
            <button
              className={`btn-control ${isRepeat ? 'active-toggle' : ''}`}
              onClick={() => setIsRepeat(!isRepeat)}
              title="Repetir canción"
            >
              🔁 {isRepeat ? 'Repetir ON' : 'Repetir'}
            </button>
          </div>
        </div>
      )}

      {/* PESTAÑA: NUBE O FAVORITAS */}
      {(tab === 'cloud' || tab === 'favorites') && (
        <section className="section-content">
          <div className="section-header">
            <h2>{tab === 'cloud' ? 'Canciones en la nube Backblaze' : 'Mis Canciones Favoritas'}</h2>
            <input
              className="filtro-input"
              placeholder="Filtrar por nombre o artista..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
          </div>

          {visibles.length === 0 ? (
            <p className="empty-notice">
              {tab === 'favorites'
                ? 'Aún no tienes canciones favoritas. Haz clic en el corazón 🤍 de cualquier canción para guardarla aquí.'
                : 'No se encontraron canciones con ese filtro.'}
            </p>
          ) : (
            <ul className="track-list">
              {visibles.map((url, idx) => (
                <li
                  key={url}
                  className={`track-item ${url === current ? 'active' : ''}`}
                  onClick={() => reproducirMP3(url)}
                >
                  <span className="track-number">{idx + 1}</span>
                  <span className="play-symbol">{url === current ? '⏸' : '▶'}</span>
                  <span className="track-title">{nombre(url)}</span>
                  <button
                    className="btn-heart-item"
                    onClick={e => toggleFavorito(url, e)}
                    title={favoritos.includes(url) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    {favoritos.includes(url) ? '❤️' : '🤍'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* PESTAÑA: YOUTUBE */}
      {tab === 'youtube' && (
        <section className="section-content">
          <h2>Videos de YouTube</h2>
          {currentVideo && (
            <div className="yt-embed-container">
              <iframe
                src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Reproductor de YouTube"
              />
            </div>
          )}

          {ytVideos.length === 0 ? (
            <p className="empty-notice">Escribe un artista o canción en la barra de búsqueda arriba y presiona "Buscar".</p>
          ) : (
            <div className="yt-grid">
              {ytVideos.map(v => (
                <div
                  key={v.id.videoId}
                  className={`yt-card ${v.id.videoId === currentVideo ? 'active' : ''}`}
                  onClick={() => reproducirYouTube(v.id.videoId)}
                >
                  <img src={v.snippet.thumbnails.default.url} alt={v.snippet.title} />
                  <div className="yt-card-info">
                    <h4>{v.snippet.title}</h4>
                    <span className="badge-play">▶ Reproducir</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* PESTAÑA: SPOTIFY */}
      {tab === 'spotify' && (
        <section className="section-content">
          <h2>Reproductor de Spotify</h2>

          {/* Opción 1: Pegar link directo sin registro */}
          <div className="spotify-box">
            <h3>Pegar enlace de canción o playlist de Spotify</h3>
            <p className="subtext">
              Copia cualquier enlace de Spotify (ej: <code>https://open.spotify.com/track/...</code> o playlist) y reprodúcela directamente aquí:
            </p>
            <div className="spotify-input-row">
              <input
                placeholder="https://open.spotify.com/track/..."
                value={spotifyInput}
                onChange={e => setSpotifyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && cargarEnlaceSpotify()}
              />
              <button className="btn-spotify-small" onClick={cargarEnlaceSpotify}>
                Cargar
              </button>
            </div>
          </div>

          {spotifyEmbedUrl && (
            <div className="spotify-embed-container">
              <iframe
                src={spotifyEmbedUrl}
                width="100%"
                height="352"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Embed"
              />
            </div>
          )}

          {/* Opción 2: Conexión OAuth opcional */}
          <div className="spotify-auth-section">
            <details>
              <summary>¿Tienes claves de desarrollador de Spotify? (Opcional)</summary>
              <div className="spotify-login-card">
                {!spotifyToken ? (
                  <button
                    className="btn-spotify"
                    onClick={() => (window.location.href = `${API}/api/spotify/login`)}
                  >
                    Conectar con Spotify Developer
                  </button>
                ) : (
                  <div>
                    <p className="success-badge">✅ Conectado con Spotify API</p>
                    <ul className="track-list">
                      {spotifyTracks.map(t => (
                        <li key={t.id} className="track-item">
                          <span className="play-symbol">🎵</span>
                          <span className="track-title">{t.name} — {t.artists.map(a => a.name).join(', ')}</span>
                          {t.preview_url && <audio controls src={t.preview_url} />}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </div>
        </section>
      )}
    </div>
  );
}
