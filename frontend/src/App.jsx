import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';

const API = import.meta.env.DEV ? 'http://localhost:8080' : '';

export default function App() {
  const [tab, setTab] = useState('cloud'); // 'cloud' | 'videos_nube' | 'youtube' | 'spotify' | 'favorites'
  
  // Audios Nube
  const [mp3Tracks, setMp3Tracks] = useState([]);
  const [current, setCurrent] = useState('');
  const [filtro, setFiltro] = useState('');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  // Videos Nube
  const [carpetasVideos, setCarpetasVideos] = useState(['Todas']);
  const [videosNube, setVideosNube] = useState([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState('Todas');
  const [currentVideoNube, setCurrentVideoNube] = useState(null);

  // YouTube
  const [ytVideos, setYtVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [ytIndex, setYtIndex] = useState(0);

  // Spotify
  const [spotifyTracks, setSpotifyTracks] = useState([]);
  const [spotifyToken, setSpotifyToken] = useState('');
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState('');
  const [spotifyInput, setSpotifyInput] = useState('');

  // Búsqueda general
  const [search, setSearch] = useState('');
  const [buscando, setBuscando] = useState(false);

  // Favoritos
  const [favoritos, setFavoritos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mp3_favoritos') || '[]');
    } catch {
      return [];
    }
  });

  const audioRef = useRef(null);
  const videoNubeRef = useRef(null);
  const ytPlayerRef = useRef(null);

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
  const audiosVisibles = listaActual.filter(u => nombre(u).toLowerCase().includes(filtro.toLowerCase()));

  const moverAudio = d => {
    if (!audiosVisibles.length) return;
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }
    if (isShuffle) {
      const azar = Math.floor(Math.random() * audiosVisibles.length);
      reproducirMP3(audiosVisibles[azar]);
      return;
    }
    const i = audiosVisibles.indexOf(current);
    const siguiente = audiosVisibles[(i + d + audiosVisibles.length) % audiosVisibles.length];
    reproducirMP3(siguiente);
  };

  const reproducirMP3 = url => {
    setCurrent(url);
    setCurrentVideo(null);
    setCurrentVideoNube(null);
  };

  const reproducirVideoNube = video => {
    setCurrentVideoNube(video);
    setCurrentVideo(null);
    if (audioRef.current) audioRef.current.pause();
  };

  const reproducirYouTube = (videoId, index = 0) => {
    setCurrentVideo(videoId);
    setYtIndex(index);
    setCurrentVideoNube(null);
    if (audioRef.current) audioRef.current.pause();
  };

  const moverYouTube = direccion => {
    if (ytVideos.length === 0) return;
    const nuevoIndex = (ytIndex + direccion + ytVideos.length) % ytVideos.length;
    reproducirYouTube(ytVideos[nuevoIndex].id.videoId, nuevoIndex);
  };

  // Cargar datos al inicio
  useEffect(() => {
    const m = window.location.hash.match(/spotify_token=([^&]+)/);
    if (m) {
      setSpotifyToken(decodeURIComponent(m[1]));
      setTab('spotify');
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Cargar MP3s
    axios.get(`${API}/api/mp3`)
      .then(r => setMp3Tracks(r.data.tracks || []))
      .catch(console.error);

    // Cargar Videos de la nube
    axios.get(`${API}/api/videos`)
      .then(r => {
        if (r.data) {
          setCarpetasVideos(r.data.carpetas || ['Todas']);
          setVideosNube(r.data.videos || []);
        }
      })
      .catch(console.error);
  }, []);

  // API de YouTube para auto-reproducción continua del siguiente video
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      crearOActualizarYTPlayer();
    };
  }, []);

  const crearOActualizarYTPlayer = () => {
    if (!currentVideo || !window.YT || !window.YT.Player) return;

    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        ytPlayerRef.current.destroy();
      }

      ytPlayerRef.current = new window.YT.Player('youtube-player-container', {
        videoId: currentVideo,
        playerVars: {
          autoplay: 1,
          rel: 0
        },
        events: {
          onStateChange: event => {
            // event.data === 0 es YT.PlayerState.ENDED (video terminó)
            if (event.data === 0) {
              moverYouTube(1); // Reproducir el siguiente automáticamente
            }
          }
        }
      });
    } catch (e) {
      console.warn('Error inicializando YouTube player:', e);
    }
  };

  useEffect(() => {
    if (currentVideo && window.YT && window.YT.Player) {
      crearOActualizarYTPlayer();
    }
  }, [currentVideo]);

  const cargarEnlaceSpotify = () => {
    if (!spotifyInput.trim()) return;
    const match = spotifyInput.match(/spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
    if (match) {
      const tipo = match[1];
      const id = match[2];
      setSpotifyEmbedUrl(`https://open.spotify.com/embed/${tipo}/${id}?utm_source=generator&theme=0`);
      if (audioRef.current) audioRef.current.pause();
      setCurrentVideo(null);
      setCurrentVideoNube(null);
    } else {
      alert('Por favor introduce un enlace válido de Spotify');
    }
  };

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

  const videosFiltrados = carpetaSeleccionada === 'Todas'
    ? videosNube
    : videosNube.filter(v => v.carpeta === carpetaSeleccionada);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎵 Reproductor Multimedia</h1>
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
            ☁️ Mi Música ({mp3Tracks.length})
          </button>
          <button
            className={`tab-btn ${tab === 'videos_nube' ? 'active' : ''}`}
            onClick={() => setTab('videos_nube')}
          >
            🎬 Mis Videos ({videosNube.length})
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
              <span className="player-status">Audio en reproducción:</span>
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
            onEnded={() => moverAudio(1)}
          />

          <div className="player-controls">
            <button className="btn-control" onClick={() => moverAudio(-1)}>⏮ Anterior</button>
            <button className="btn-control" onClick={() => moverAudio(1)}>Siguiente ⏭</button>
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

      {/* PESTAÑA: AUDIOS NUBE O FAVORITAS */}
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

          {audiosVisibles.length === 0 ? (
            <p className="empty-notice">
              {tab === 'favorites'
                ? 'Aún no tienes canciones favoritas. Haz clic en el corazón 🤍 de cualquier canción.'
                : 'No se encontraron canciones.'}
            </p>
          ) : (
            <ul className="track-list">
              {audiosVisibles.map((url, idx) => (
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
                  >
                    {favoritos.includes(url) ? '❤️' : '🤍'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* PESTAÑA: VIDEOS NUBE (BACKBLAZE CON CARPETAS) */}
      {tab === 'videos_nube' && (
        <section className="section-content">
          <div className="section-header">
            <h2>Videos en la Nube Backblaze</h2>
          </div>

          {/* Selector de Carpetas */}
          <div className="folder-pills">
            <span className="folder-label">Carpetas:</span>
            {carpetasVideos.map(c => (
              <button
                key={c}
                className={`pill-btn ${carpetaSeleccionada === c ? 'active' : ''}`}
                onClick={() => setCarpetaSeleccionada(c)}
              >
                📁 {c}
              </button>
            ))}
          </div>

          {/* Reproductor de Video Activo */}
          {currentVideoNube && (
            <div className="video-player-box">
              <div className="video-header-bar">
                <strong>🎬 {currentVideoNube.titulo}</strong>
                <span className="video-folder-badge">📁 {currentVideoNube.carpeta}</span>
              </div>
              <video
                ref={videoNubeRef}
                controls
                autoPlay
                className="cloud-video-element"
                src={currentVideoNube.url}
              />
            </div>
          )}

          {videosFiltrados.length === 0 ? (
            <div className="empty-notice">
              <p>No hay videos en esta carpeta todavía.</p>
              <p className="subtext">Sube tus videos en la carpeta correspondiente para verlos aquí.</p>
            </div>
          ) : (
            <div className="video-grid">
              {videosFiltrados.map(v => (
                <div
                  key={v.url}
                  className={`video-card ${currentVideoNube?.url === v.url ? 'active' : ''}`}
                  onClick={() => reproducirVideoNube(v)}
                >
                  <div className="video-card-thumb">
                    <span className="video-play-icon">▶</span>
                  </div>
                  <div className="video-card-info">
                    <h4>{v.titulo}</h4>
                    <span className="video-card-folder">📁 {v.carpeta}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* PESTAÑA: YOUTUBE */}
      {tab === 'youtube' && (
        <section className="section-content">
          <div className="section-header">
            <h2>Videos de YouTube</h2>
            {ytVideos.length > 0 && currentVideo && (
              <div className="yt-controls-bar">
                <button className="btn-control" onClick={() => moverYouTube(-1)}>⏮ Video Anterior</button>
                <button className="btn-control" onClick={() => moverYouTube(1)}>Siguiente Video ⏭</button>
                <span className="yt-auto-badge">🔁 Reproducción Continua Activada</span>
              </div>
            )}
          </div>

          {currentVideo && (
            <div className="yt-embed-container">
              <div id="youtube-player-container" />
            </div>
          )}

          {ytVideos.length === 0 ? (
            <p className="empty-notice">Escribe un artista o canción en el buscador arriba y presiona "Buscar".</p>
          ) : (
            <div className="yt-grid">
              {ytVideos.map((v, idx) => (
                <div
                  key={v.id.videoId}
                  className={`yt-card ${v.id.videoId === currentVideo ? 'active' : ''}`}
                  onClick={() => reproducirYouTube(v.id.videoId, idx)}
                >
                  <img src={v.snippet.thumbnails.default.url} alt={v.snippet.title} />
                  <div className="yt-card-info">
                    <h4>{v.snippet.title}</h4>
                    <span className="badge-play">
                      {v.id.videoId === currentVideo ? '▶ Reproduciendo' : '▶ Reproducir'}
                    </span>
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
          <div className="spotify-box">
            <h3>Pegar enlace de Spotify</h3>
            <p className="subtext">
              Copia cualquier enlace de Spotify (canción, álbum o playlist) y reprodúcelo aquí:
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
        </section>
      )}
    </div>
  );
}
