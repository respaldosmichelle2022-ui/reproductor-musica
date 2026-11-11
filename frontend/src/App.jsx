import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';

const API = import.meta.env.DEV ? 'http://localhost:8080' : '';

const PLAYLISTS_SPOTIFY_RECOMENDADAS = [
  { id: '37i9dQZF1DX10zKzsJ2jva', titulo: 'Viva Latino', desc: 'Los mayores éxitos y lanzamientos de la música latina', img: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84b8d538e1247ee0ec5c331908' },
  { id: '37i9dQZF1DXcBWIGoYBM5M', titulo: 'Today\'s Top Hits', desc: 'Lo más escuchado a nivel mundial en este momento', img: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da849bb6af539d072de34548d15c' },
  { id: '37i9dQZF1DWZo9T7uQ4oP7', titulo: 'Baladas Románticas', desc: 'Grandes canciones de amor y clásicos inolvidables', img: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da847f6c387b337ceb69324aa867' },
  { id: '37i9dQZF1DX8m36u1iGZ8L', titulo: 'Cumbias Inmortales', desc: 'El ritmo y sabor de las mejores cumbias para celebrar', img: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84166bb9a891be49be083dfd88' },
  { id: '37i9dQZF1DX56b2WjR2x5I', titulo: 'Rock en Español 80s y 90s', desc: 'Los himnos del rock en español que marcaron historia', img: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84e2b96d92ec12933dd5ea0553' },
  { id: '37i9dQZF1DWXRqgorJj26U', titulo: 'Rock Clásico', desc: 'Leyendas de la música y clásicos internacionales', img: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84fc091f0cc3d37fb94b29381d' }
];

export default function App() {
  const [tab, setTab] = useState('cloud'); // 'cloud' | 'videos_nube' | 'youtube' | 'spotify' | 'favorites'
  
  // Audios Nube
  const [mp3Tracks, setMp3Tracks] = useState([]);
  const [titulosMP3, setTitulosMP3] = useState({});
  const [tracksDetalle, setTracksDetalle] = useState([]);
  const [categoriasMusica, setCategoriasMusica] = useState(['Todas']);
  const [categoriaMusicaSeleccionada, setCategoriaMusicaSeleccionada] = useState('Todas');
  const [current, setCurrent] = useState('');
  const [filtro, setFiltro] = useState('');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [cargandoMusica, setCargandoMusica] = useState(false);

  // Videos Nube
  const [carpetasVideos, setCarpetasVideos] = useState(['Todas']);
  const [videosNube, setVideosNube] = useState([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState('Todas');
  const [currentVideoNube, setCurrentVideoNube] = useState(null);

  // YouTube
  const [ytVideos, setYtVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [ytIndex, setYtIndex] = useState(0);
  const [modoRadioYT, setModoRadioYT] = useState(true);

  // Spotify (Autenticación y Reproducción Oficial)
  const [spotifyToken, setSpotifyToken] = useState(() => localStorage.getItem('spotify_token') || '');
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [spotifySubTab, setSpotifySubTab] = useState('recomendadas'); // 'recomendadas' | 'buscar' | 'playlists' | 'link'
  const [spotifySearchQuery, setSpotifySearchQuery] = useState('');
  const [spotifySearchResults, setSpotifySearchResults] = useState(null);
  const [spotifyBuscando, setSpotifyBuscando] = useState(false);
  const [spotifyUserPlaylists, setSpotifyUserPlaylists] = useState([]);
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState('https://open.spotify.com/embed/playlist/37i9dQZF1DX10zKzsJ2jva?utm_source=generator&theme=0');
  const [spotifyInput, setSpotifyInput] = useState('');
  const [spotifyPlayerDeviceId, setSpotifyPlayerDeviceId] = useState('');
  const spotifyPlayerRef = useRef(null);

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
    if (titulosMP3 && titulosMP3[url]) return titulosMP3[url];
    const sinParametros = url.split('?')[0];
    let n = decodeURIComponent(sinParametros.split('/').pop()).replace(/\.mp3$/i, '');
    return n.replace(/_/g, ' ').trim();
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
  const audiosFiltrados = listaActual.filter(u => {
    if (tab !== 'cloud' || categoriaMusicaSeleccionada === 'Todas') return true;
    const item = tracksDetalle.find(d => d.url === u);
    return item ? item.categoria === categoriaMusicaSeleccionada : true;
  });
  const audiosVisibles = audiosFiltrados.filter(u => nombre(u).toLowerCase().includes(filtro.toLowerCase()));

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

  const cerrarReproductorMP3 = () => {
    if (audioRef.current) audioRef.current.pause();
    setCurrent('');
  };

  const pantallaCompletaVideo = () => {
    if (videoNubeRef.current) {
      if (videoNubeRef.current.requestFullscreen) {
        videoNubeRef.current.requestFullscreen();
      } else if (videoNubeRef.current.webkitRequestFullscreen) {
        videoNubeRef.current.webkitRequestFullscreen();
      }
    }
  };

  const reproducirYouTube = (videoId, index = 0) => {
    setCurrentVideo(videoId);
    setYtIndex(index);
    setCurrentVideoNube(null);
    if (audioRef.current) audioRef.current.pause();
  };

  const siguienteYouTube = () => {
    if (modoRadioYT && ytPlayerRef.current && typeof ytPlayerRef.current.nextVideo === 'function') {
      ytPlayerRef.current.nextVideo();
    } else if (ytVideos.length > 0) {
      const nuevoIndex = (ytIndex + 1) % ytVideos.length;
      reproducirYouTube(ytVideos[nuevoIndex].id.videoId, nuevoIndex);
    }
  };

  const anteriorYouTube = () => {
    if (modoRadioYT && ytPlayerRef.current && typeof ytPlayerRef.current.previousVideo === 'function') {
      ytPlayerRef.current.previousVideo();
    } else if (ytVideos.length > 0) {
      const nuevoIndex = (ytIndex - 1 + ytVideos.length) % ytVideos.length;
      reproducirYouTube(ytVideos[nuevoIndex].id.videoId, nuevoIndex);
    }
  };

  const cambiarPestana = nuevaPestana => {
    setTab(nuevaPestana);
    // Si cambiamos a videos o youtube, pausar mp3 para no encimar sonidos
    if (nuevaPestana === 'youtube' || nuevaPestana === 'videos_nube') {
      if (audioRef.current) audioRef.current.pause();
    }
    // Si entramos a YouTube y está vacío, cargar sugerencias iniciales
    if (nuevaPestana === 'youtube' && ytVideos.length === 0) {
      cargarSugerenciasYouTube();
    }
  };

  const cargarSugerenciasYouTube = () => {
    axios.get(`${API}/api/youtube/search`, { params: { q: 'Grandes Exitos Musica Latina' } })
      .then(r => setYtVideos(r.data.items || []))
      .catch(console.error);
  };

  const cargarMusica = (reintentos = 3) => {
    setCargandoMusica(true);
    axios.get(`${API}/api/mp3`)
      .then(r => {
        const tracks = r.data.tracks || [];
        setMp3Tracks(tracks);
        if (r.data.titles) setTitulosMP3(r.data.titles);
        if (r.data.tracksDetalle) setTracksDetalle(r.data.tracksDetalle);
        if (r.data.categorias) setCategoriasMusica(r.data.categorias);
        setCargandoMusica(false);
        if (tracks.length === 0 && reintentos > 0) {
          setTimeout(() => cargarMusica(reintentos - 1), 1500);
        }
      })
      .catch(err => {
        console.error('Error cargando MP3s:', err);
        setCargandoMusica(false);
        if (reintentos > 0) {
          setTimeout(() => cargarMusica(reintentos - 1), 2000);
        }
      });
  };

  const cargarVideos = () => {
    axios.get(`${API}/api/videos`)
      .then(r => {
        if (r.data) {
          setCarpetasVideos(r.data.carpetas || ['Todas']);
          setVideosNube(r.data.videos || []);
        }
      })
      .catch(console.error);
  };

  // Cargar datos al inicio
  useEffect(() => {
    cargarMusica(3);
    cargarVideos();
    cargarSugerenciasYouTube(); // Pre-cargar sugerencias para que YouTube nunca esté vacío
  }, []);

  // API de YouTube
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

      const playerConfig = {
        videoId: currentVideo,
        playerVars: {
          autoplay: 1,
          rel: 0
        },
        events: {
          onStateChange: event => {
            if (event.data === 0) {
              siguienteYouTube();
            }
          }
        }
      };

      if (modoRadioYT) {
        playerConfig.playerVars.listType = 'playlist';
        playerConfig.playerVars.list = 'RD' + currentVideo;
      }

      ytPlayerRef.current = new window.YT.Player('youtube-player-container', playerConfig);
    } catch (e) {
      console.warn('Error inicializando YouTube player:', e);
    }
  };

  useEffect(() => {
    if (currentVideo && window.YT && window.YT.Player) {
      crearOActualizarYTPlayer();
    }
  }, [currentVideo, modoRadioYT]);

  // --- SPOTIFY: Autenticación, SDK y Funciones ---
  useEffect(() => {
    // Revisar si volvemos del login de Spotify en el hash
    const hash = window.location.hash;
    if (hash && hash.includes('spotify_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('spotify_token');
      const refresh = params.get('refresh_token');
      if (token) {
        localStorage.setItem('spotify_token', token);
        if (refresh) localStorage.setItem('spotify_refresh_token', refresh);
        setSpotifyToken(token);
        setTab('spotify');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (!spotifyToken) {
      setSpotifyUser(null);
      setSpotifyUserPlaylists([]);
      return;
    }

    // 1. Perfil del usuario
    axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${spotifyToken}` }
    }).then(r => {
      setSpotifyUser(r.data);
    }).catch(err => {
      if (err.response && err.response.status === 401) {
        cerrarSesionSpotify();
      }
    });

    // 2. Playlists del usuario
    axios.get('https://api.spotify.com/v1/me/playlists?limit=30', {
      headers: { Authorization: `Bearer ${spotifyToken}` }
    }).then(r => {
      setSpotifyUserPlaylists(r.data.items || []);
    }).catch(console.error);

    // 3. Inicializar Web Playback SDK
    const initPlayer = () => {
      if (!window.Spotify || !window.Spotify.Player || spotifyPlayerRef.current) return;
      try {
        const player = new window.Spotify.Player({
          name: 'Reproductor Multimedia Cloud',
          getOAuthToken: cb => cb(spotifyToken),
          volume: 0.8
        });

        player.addListener('ready', ({ device_id }) => {
          setSpotifyPlayerDeviceId(device_id);
        });

        player.addListener('not_ready', () => {
          setSpotifyPlayerDeviceId('');
        });

        player.connect();
        spotifyPlayerRef.current = player;
      } catch (e) {
        console.warn('Error al iniciar Spotify SDK:', e);
      }
    };

    if (window.Spotify && window.Spotify.Player) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    return () => {
      if (spotifyPlayerRef.current) {
        try { spotifyPlayerRef.current.disconnect(); } catch {}
        spotifyPlayerRef.current = null;
      }
    };
  }, [spotifyToken]);

  const loginSpotify = () => {
    window.location.href = `${API}/api/spotify/login`;
  };

  const cerrarSesionSpotify = () => {
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_refresh_token');
    setSpotifyToken('');
    setSpotifyUser(null);
    setSpotifyUserPlaylists([]);
    if (spotifyPlayerRef.current) {
      try { spotifyPlayerRef.current.disconnect(); } catch {}
      spotifyPlayerRef.current = null;
    }
  };

  const reproducirContextoSpotify = (uriOrId, tipo = 'playlist') => {
    if (audioRef.current) audioRef.current.pause();
    setCurrentVideo(null);
    setCurrentVideoNube(null);

    // Mandar comando a SDK si está conectado
    if (spotifyToken && spotifyPlayerDeviceId && uriOrId.startsWith('spotify:')) {
      axios.put(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyPlayerDeviceId}`,
        uriOrId.includes(':track:') ? { uris: [uriOrId] } : { context_uri: uriOrId },
        { headers: { Authorization: `Bearer ${spotifyToken}` } }
      ).catch(e => console.warn('SDK play fallback:', e.message));
    }

    // Cargar embed interactivo oficial
    let id = uriOrId;
    if (uriOrId.startsWith('spotify:')) {
      id = uriOrId.split(':').pop();
    }
    setSpotifyEmbedUrl(`https://open.spotify.com/embed/${tipo}/${id}?utm_source=generator&theme=0`);
  };

  const buscarSpotify = async () => {
    if (!spotifySearchQuery.trim()) return;
    setSpotifyBuscando(true);
    try {
      if (spotifyToken) {
        const r = await axios.get('https://api.spotify.com/v1/search', {
          params: { q: spotifySearchQuery, type: 'track,playlist', limit: 10 },
          headers: { Authorization: `Bearer ${spotifyToken}` }
        });
        setSpotifySearchResults(r.data);
      } else {
        const r = await axios.get(`${API}/api/spotify/search`, {
          params: { q: spotifySearchQuery }
        });
        setSpotifySearchResults(r.data);
      }
    } catch (e) {
      console.error('Error buscando en Spotify:', e);
    }
    setSpotifyBuscando(false);
  };

  const cargarEnlaceSpotify = () => {
    if (!spotifyInput.trim()) return;
    const match = spotifyInput.match(/spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
    if (match) {
      const tipo = match[1];
      const id = match[2];
      reproducirContextoSpotify(id, tipo);
    } else {
      alert('Por favor introduce un enlace válido de Spotify');
    }
  };

  const extraerIdYouTube = texto => {
    const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = texto.match(reg);
    return match ? match[1] : null;
  };

  const buscar = async () => {
    if (!search.trim()) return;
    const directId = extraerIdYouTube(search.trim());
    if (directId) {
      setTab('youtube');
      reproducirYouTube(directId);
      setSearch('');
      return;
    }
    setBuscando(true);
    setFiltro(search);

    try {
      const yt = await axios.get(`${API}/api/youtube/search`, { params: { q: search } });
      setYtVideos(yt.data.items || []);
      setTab('youtube');
    } catch (e) {
      console.error(e);
    }
    setBuscando(false);
  };

  const videosFiltrados = carpetaSeleccionada === 'Todas'
    ? videosNube
    : videosNube.filter(v => v.carpeta === carpetaSeleccionada);

  // El reproductor flotante de MP3 SOLO debe mostrarse cuando estás escuchando música de la nube o favoritas
  const mostrarReproductorMP3 = Boolean(current) && (tab === 'cloud' || tab === 'favorites');

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
            onClick={() => cambiarPestana('cloud')}
          >
            ☁️ Mi Música ({mp3Tracks.length})
          </button>
          <button
            className={`tab-btn ${tab === 'videos_nube' ? 'active' : ''}`}
            onClick={() => cambiarPestana('videos_nube')}
          >
            🎬 Mis Videos ({videosNube.length})
          </button>
          <button
            className={`tab-btn ${tab === 'favorites' ? 'active' : ''}`}
            onClick={() => cambiarPestana('favorites')}
          >
            ❤️ Favoritas ({favoritos.length})
          </button>
          <button
            className={`tab-btn ${tab === 'youtube' ? 'active' : ''}`}
            onClick={() => cambiarPestana('youtube')}
          >
            ▶ YouTube {ytVideos.length > 0 && `(${ytVideos.length})`}
          </button>
          <button
            className={`tab-btn ${tab === 'spotify' ? 'active' : ''}`}
            onClick={() => cambiarPestana('spotify')}
          >
            🟢 Spotify
          </button>
        </nav>
      </header>

      {/* REPRODUCTOR DE MP3 FLOTANTE (Solo se muestra en Mi Música o Favoritas para no estorbar en YouTube o Videos) */}
      {mostrarReproductorMP3 && (
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
            <button
              className="btn-close-player"
              onClick={cerrarReproductorMP3}
              title="Cerrar reproductor"
            >
              ✕
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
            <div className="section-title-row">
              <h2>{tab === 'cloud' ? 'Canciones en la Nube' : 'Mis Canciones Favoritas'}</h2>
              {tab === 'cloud' && (
                <button
                  className="btn-refresh-small"
                  onClick={() => cargarMusica(2)}
                  title="Recargar canciones de la nube"
                  disabled={cargandoMusica}
                >
                  {cargandoMusica ? 'Cargando...' : '🔄 Actualizar'}
                </button>
              )}
            </div>
            <input
              className="filtro-input"
              placeholder="Filtrar por nombre o artista..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
          </div>

          {/* Selector de Géneros / Carpetas (solo en Mi Música) */}
          {tab === 'cloud' && categoriasMusica.length > 1 && (
            <div className="folder-pills">
              <span className="folder-label">Géneros:</span>
              {categoriasMusica.map(c => (
                <button
                  key={c}
                  className={`pill-btn ${categoriaMusicaSeleccionada === c ? 'active' : ''}`}
                  onClick={() => setCategoriaMusicaSeleccionada(c)}
                >
                  🎵 {c}
                </button>
              ))}
            </div>
          )}

          {audiosVisibles.length === 0 ? (
            <p className="empty-notice">
              {cargandoMusica
                ? 'Conectando con la nube Backblaze...'
                : tab === 'favorites'
                ? 'Aún no tienes canciones favoritas. Haz clic en el corazón 🤍 de cualquier canción.'
                : filtro
                ? `No se encontraron canciones con "${filtro}".`
                : 'Cargando lista de canciones de la nube...'}
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

      {/* PESTAÑA: VIDEOS NUBE */}
      {tab === 'videos_nube' && (
        <section className="section-content">
          <div className="section-header">
            <h2>🎬 Mis Videos en la Nube</h2>
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
                <div>
                  <strong>🎬 {currentVideoNube.titulo}</strong>
                  <span className="video-folder-badge">📁 {currentVideoNube.carpeta}</span>
                </div>
                <div className="video-actions">
                  {currentVideoNube.tipo !== 'youtube' ? (
                    <>
                      <button className="btn-fullscreen-native" onClick={pantallaCompletaVideo}>
                        ⛶ Pantalla Completa
                      </button>
                      <a
                        href={currentVideoNube.url}
                        download={currentVideoNube.archivo}
                        className="btn-download-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ⬇️ Descargar
                      </a>
                    </>
                  ) : (
                    <a
                      href={currentVideoNube.url}
                      className="btn-download-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ↗ Ver en YouTube
                    </a>
                  )}
                </div>
              </div>
              {currentVideoNube.tipo === 'youtube' ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${currentVideoNube.youtubeId}?autoplay=1&rel=0`}
                    title={currentVideoNube.titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                  />
                </div>
              ) : (
                <video
                  ref={videoNubeRef}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="cloud-video-element"
                  src={currentVideoNube.url}
                />
              )}
            </div>
          )}

          {videosFiltrados.length === 0 ? (
            <div className="empty-notice">
              <p>No hay videos en esta carpeta todavía.</p>
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
                    {v.tipo === 'youtube' ? (
                      <>
                        <img
                          src={`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                          alt={v.titulo}
                          className="video-card-thumb-img"
                        />
                        <span className="badge-youtube-card">▶ YouTube</span>
                      </>
                    ) : (
                      <span className="video-play-icon">▶</span>
                    )}
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
            {currentVideo && (
              <div className="yt-controls-bar">
                <button className="btn-control" onClick={anteriorYouTube}>⏮ Anterior</button>
                <button className="btn-control" onClick={siguienteYouTube}>Siguiente Recomendada ⏭</button>
                <button
                  className={`btn-mode-toggle ${modoRadioYT ? 'active' : ''}`}
                  onClick={() => setModoRadioYT(!modoRadioYT)}
                  title="Cambia entre reproducir sugerencias de YouTube o la lista buscada"
                >
                  {modoRadioYT ? '📻 Radio Sugerencias: ACTIVADO' : '📋 Lista Búsqueda: FIJA'}
                </button>
              </div>
            )}
          </div>

          {currentVideo && (
            <div className="yt-embed-container">
              <div id="youtube-player-container" />
            </div>
          )}

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
        </section>
      )}

      {/* PESTAÑA: SPOTIFY (DISEÑO OFICIAL IDÉNTICO) */}
      {tab === 'spotify' && (
        <section className="section-content spotify-main-section">
          {/* Header Superior Oficial de Spotify */}
          <div className="spotify-top-header">
            <div className="spotify-brand">
              <svg className="spotify-logo-svg" viewBox="0 0 24 24" width="38" height="38" fill="#1DB954">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.307c-.218.358-.684.471-1.042.253-2.857-1.745-6.455-2.141-10.693-1.173-.41.094-.82-.162-.914-.572-.094-.41.162-.82.572-.914 4.636-1.059 8.604-.614 11.824 1.364.358.218.471.684.253 1.042zm1.47-3.267c-.275.447-.859.589-1.306.314-3.272-2.012-8.259-2.594-12.128-1.419-.504.153-1.041-.137-1.194-.641-.153-.504.137-1.041.641-1.194 4.417-1.341 9.907-.692 13.673 1.634.447.275.589.859.314 1.306zm.126-3.41c-3.924-2.33-10.388-2.544-14.136-1.406-.601.182-1.243-.167-1.425-.768-.182-.601.167-1.243.768-1.425 4.312-1.309 11.442-1.062 15.945 1.611.541.321.719 1.026.398 1.567-.321.541-1.026.719-1.567.398z"/>
              </svg>
              <div>
                <h2 className="spotify-title-main">Spotify</h2>
                <span className="spotify-sub-status">
                  {spotifyUser ? `Sesión iniciada con: ${spotifyUser.display_name}` : 'Música oficial en Streaming'}
                </span>
              </div>
            </div>

            {/* Acciones de Usuario: Iniciar Sesión / Cerrar Sesión */}
            <div className="spotify-user-actions">
              {spotifyUser ? (
                <div className="spotify-profile-badge">
                  {spotifyUser.images && spotifyUser.images[0] ? (
                    <img src={spotifyUser.images[0].url} alt={spotifyUser.display_name} className="spotify-avatar" />
                  ) : (
                    <div className="spotify-avatar-fallback">
                      {spotifyUser.display_name ? spotifyUser.display_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="spotify-profile-info">
                    <span className="spotify-user-name">{spotifyUser.display_name}</span>
                    <span className={`badge-subscription ${spotifyUser.product === 'premium' ? 'premium' : 'free'}`}>
                      {spotifyUser.product === 'premium' ? '👑 PREMIUM' : 'GRATIS'}
                    </span>
                  </div>
                  <button
                    className="btn-spotify-logout"
                    onClick={cerrarSesionSpotify}
                    title="Cerrar sesión actual para entrar con otra cuenta de prueba"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <button className="btn-spotify-login" onClick={loginSpotify}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.307c-.218.358-.684.471-1.042.253-2.857-1.745-6.455-2.141-10.693-1.173-.41.094-.82-.162-.914-.572-.094-.41.162-.82.572-.914 4.636-1.059 8.604-.614 11.824 1.364.358.218.471.684.253 1.042zm1.47-3.267c-.275.447-.859.589-1.306.314-3.272-2.012-8.259-2.594-12.128-1.419-.504.153-1.041-.137-1.194-.641-.153-.504.137-1.041.641-1.194 4.417-1.341 9.907-.692 13.673 1.634.447.275.589.859.314 1.306zm.126-3.41c-3.924-2.33-10.388-2.544-14.136-1.406-.601.182-1.243-.167-1.425-.768-.182-.601.167-1.243.768-1.425 4.312-1.309 11.442-1.062 15.945 1.611.541.321.719 1.026.398 1.567-.321.541-1.026.719-1.567.398z"/>
                  </svg>
                  Iniciar sesión con Spotify
                </button>
              )}
            </div>
          </div>

          {/* Subpestañas estilo Spotify */}
          <div className="spotify-nav-pills">
            <button
              className={`pill-btn ${spotifySubTab === 'recomendadas' ? 'active' : ''}`}
              onClick={() => setSpotifySubTab('recomendadas')}
            >
              🔥 Éxitos y Recomendadas
            </button>
            <button
              className={`pill-btn ${spotifySubTab === 'buscar' ? 'active' : ''}`}
              onClick={() => setSpotifySubTab('buscar')}
            >
              🔍 Buscar en Spotify
            </button>
            {spotifyUser && (
              <button
                className={`pill-btn ${spotifySubTab === 'playlists' ? 'active' : ''}`}
                onClick={() => setSpotifySubTab('playlists')}
              >
                📚 Mis Playlists ({spotifyUserPlaylists.length})
              </button>
            )}
            <button
              className={`pill-btn ${spotifySubTab === 'link' ? 'active' : ''}`}
              onClick={() => setSpotifySubTab('link')}
            >
              🔗 Pegar Enlace Directo
            </button>
          </div>

          {/* Reproductor Embebido Activo de Spotify */}
          {spotifyEmbedUrl && (
            <div className="spotify-active-embed-box">
              <iframe
                src={spotifyEmbedUrl}
                width="100%"
                height="380"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify Interactive Player"
                className="spotify-iframe-player"
              />
            </div>
          )}

          {/* Vista 1: RECOMENDADAS */}
          {spotifySubTab === 'recomendadas' && (
            <div className="spotify-content-block">
              <h3 className="spotify-section-heading">Listas de reproducción destacadas</h3>
              <div className="spotify-grid">
                {PLAYLISTS_SPOTIFY_RECOMENDADAS.map(pl => (
                  <div
                    key={pl.id}
                    className="spotify-card"
                    onClick={() => reproducirContextoSpotify(pl.id, 'playlist')}
                  >
                    <div className="spotify-card-cover-wrap">
                      <img src={pl.img} alt={pl.titulo} className="spotify-card-img" />
                      <button className="spotify-play-hover-btn" title="Reproducir en Spotify">
                        ▶
                      </button>
                    </div>
                    <div className="spotify-card-text">
                      <h4>{pl.titulo}</h4>
                      <p>{pl.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vista 2: BUSCADOR */}
          {spotifySubTab === 'buscar' && (
            <div className="spotify-content-block">
              <div className="spotify-search-bar">
                <input
                  placeholder="¿Qué quieres escuchar en Spotify? (Canción, artista o playlist)..."
                  value={spotifySearchQuery}
                  onChange={e => setSpotifySearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarSpotify()}
                />
                <button className="btn-spotify-small" onClick={buscarSpotify} disabled={spotifyBuscando}>
                  {spotifyBuscando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {spotifySearchResults?.tracks?.items && (
                <div className="spotify-results-section">
                  <h3 className="spotify-section-heading">Canciones</h3>
                  <div className="spotify-tracks-table">
                    {spotifySearchResults.tracks.items.map((t, idx) => (
                      <div
                        key={t.id}
                        className="spotify-track-row"
                        onClick={() => reproducirContextoSpotify(t.uri || t.id, 'track')}
                      >
                        <span className="track-idx">{idx + 1}</span>
                        <img
                          src={t.album?.images?.[2]?.url || t.album?.images?.[0]?.url}
                          alt={t.name}
                          className="spotify-track-thumb"
                        />
                        <div className="spotify-track-names">
                          <span className="track-title-bold">{t.name}</span>
                          <span className="track-artist-sub">{t.artists?.map(a => a.name).join(', ')}</span>
                        </div>
                        <span className="track-album-sub">{t.album?.name}</span>
                        <span className="track-dur">
                          {Math.floor(t.duration_ms / 60000)}:
                          {String(Math.floor((t.duration_ms % 60000) / 1000)).padStart(2, '0')}
                        </span>
                        <button className="btn-play-row" title="Reproducir">▶</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vista 3: MIS PLAYLISTS */}
          {spotifySubTab === 'playlists' && (
            <div className="spotify-content-block">
              <h3 className="spotify-section-heading">Tus Listas de Reproducción Guardadas</h3>
              {spotifyUserPlaylists.length === 0 ? (
                <p className="empty-notice">No se encontraron playlists en esta cuenta.</p>
              ) : (
                <div className="spotify-grid">
                  {spotifyUserPlaylists.map(pl => (
                    <div
                      key={pl.id}
                      className="spotify-card"
                      onClick={() => reproducirContextoSpotify(pl.id, 'playlist')}
                    >
                      <div className="spotify-card-cover-wrap">
                        {pl.images?.[0] ? (
                          <img src={pl.images[0].url} alt={pl.name} className="spotify-card-img" />
                        ) : (
                          <div className="spotify-card-img placeholder">🎵</div>
                        )}
                        <button className="spotify-play-hover-btn" title="Reproducir">▶</button>
                      </div>
                      <div className="spotify-card-text">
                        <h4>{pl.name}</h4>
                        <p>{pl.tracks?.total || 0} canciones • De {pl.owner?.display_name || 'Spotify'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vista 4: PEGAR ENLACE DIRECTO */}
          {spotifySubTab === 'link' && (
            <div className="spotify-box">
              <h3>Pegar enlace de Spotify</h3>
              <p className="subtext">
                Copia cualquier enlace de Spotify (canción, álbum o playlist) y reprodúcelo aquí:
              </p>
              <div className="spotify-input-row">
                <input
                  placeholder="https://open.spotify.com/playlist/... o /track/..."
                  value={spotifyInput}
                  onChange={e => setSpotifyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && cargarEnlaceSpotify()}
                />
                <button className="btn-spotify-small" onClick={cargarEnlaceSpotify}>
                  Cargar
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
