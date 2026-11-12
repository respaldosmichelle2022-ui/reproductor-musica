import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';

const API = import.meta.env.DEV ? 'http://localhost:8080' : '';

const PLAYLISTS_SPOTIFY_RECOMENDADAS = [
  { id: '37i9dQZF1DX10zKzsJ2jva', titulo: 'Viva Latino', desc: 'Los mayores éxitos de la música latina', emoji: '🔥', color: 'linear-gradient(135deg, #ff4e50, #f9d423)', query: 'Exitos Musica Latina Reggaeton Pop Latino' },
  { id: '37i9dQZF1DXcBWIGoYBM5M', titulo: 'Today\'s Top Hits', desc: 'Lo más escuchado a nivel mundial', emoji: '🌎', color: 'linear-gradient(135deg, #8e2de2, #4a00e0)', query: 'Global Top Hits Pop 2025' },
  { id: 'baladas-rom', titulo: 'Baladas Románticas', desc: 'Grandes canciones de amor y clásicos inolvidables', emoji: '💕', color: 'linear-gradient(135deg, #eb3349, #f45c43)', query: 'Baladas Romanticas en Español Clasicas' },
  { id: 'cumbias-inm', titulo: 'Cumbias Inmortales', desc: 'El ritmo y sabor de las mejores cumbias para celebrar', emoji: '💃', color: 'linear-gradient(135deg, #11998e, #38ef7d)', query: 'Cumbias Inmortales Los Angeles Azules Sonora Dinamita' },
  { id: '37i9dQZF1DX8SfyqmSFDwe', titulo: 'Reggaetón Old School', desc: 'Los clásicos del reggaetón de siempre', emoji: '🎤', color: 'linear-gradient(135deg, #f12711, #f5af19)', query: 'Reggaeton Old School Daddy Yankee Don Omar Tego' },
  { id: '37i9dQZF1DX2apWzyECwyZ', titulo: 'This Is Bad Bunny', desc: 'Lo esencial de Bad Bunny', emoji: '🐰', color: 'linear-gradient(135deg, #00b09b, #96c93d)', query: 'Bad Bunny' },
  { id: '37i9dQZF1DX4UtSsGT1Sbe', titulo: 'Éxitos de los 80s', desc: 'Himnos que marcaron una década', emoji: '📼', color: 'linear-gradient(135deg, #fc466b, #3f5efb)', query: 'Clasicos de los 80 en Español e Ingles' },
  { id: '37i9dQZF1DXbTxeAdrVG2l', titulo: 'Éxitos de los 90s', desc: 'Los grandes hits de los noventa', emoji: '💿', color: 'linear-gradient(135deg, #00c6ff, #0072ff)', query: 'Exitos de los 90 en Español' },
  { id: '37i9dQZF1DWXRqgorJj26U', titulo: 'Rock Clásico y en Español', desc: 'Leyendas del rock en español e internacional', emoji: '🎸', color: 'linear-gradient(135deg, #434343, #000000)', query: 'Rock en Español Soda Stereo Caifanes Hombres G Enanitos Verdes' },
  { id: 'gruperas-rom', titulo: 'Gruperas y Románticas', desc: 'Los Acosta, Bronco, Temerarios y grandes ídolos', emoji: '🤠', color: 'linear-gradient(135deg, #f7971e, #ffd200)', query: 'Los Acosta Bronco Los Temerarios Los Bukis' }
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

  // Videos Nube (Protegidos por Carpeta con Contraseña Maestra y Pases Temporales)
  const [carpetasVideos, setCarpetasVideos] = useState([]);
  const [resumenCarpetasVideos, setResumenCarpetasVideos] = useState([]);
  const [totalVideosNube, setTotalVideosNube] = useState(0);
  const [videosNube, setVideosNube] = useState([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState('');
  const [currentVideoNube, setCurrentVideoNube] = useState(null);
  const [carpetasDesbloqueadas, setCarpetasDesbloqueadas] = useState([]);
  const [esAdminVideos, setEsAdminVideos] = useState(false);
  const [claveAdminGuardada, setClaveAdminGuardada] = useState('');
  const [expiracionPaseMs, setExpiracionPaseMs] = useState(null);
  const [modalClaveCarpeta, setModalClaveCarpeta] = useState('');
  const [inputClaveVideo, setInputClaveVideo] = useState('');
  const [errorClaveVideo, setErrorClaveVideo] = useState('');
  const [verificandoClave, setVerificandoClave] = useState(false);
  const [modalGenerarPase, setModalGenerarPase] = useState(false);
  const [paseCarpetaDestino, setPaseCarpetaDestino] = useState('TODAS');
  const [paseMinutos, setPaseMinutos] = useState(60);
  const [paseGenerado, setPaseGenerado] = useState(null);
  const [copiadoPase, setCopiadoPase] = useState(false);

  // YouTube (con Modo Operativo Anti-Distracción protegible con contraseña)
  const [ytVideos, setYtVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [ytIndex, setYtIndex] = useState(0);
  const [modoRadioYT, setModoRadioYT] = useState(true);
  const [ytSearchQuery, setYtSearchQuery] = useState('');
  const [ytBuscando, setYtBuscando] = useState(false);
  const [ytPantallaBloqueada, setYtPantallaBloqueada] = useState(true);
  const [ytPausado, setYtPausado] = useState(false);
  const [modalDesbloquearYT, setModalDesbloquearYT] = useState(false);
  const [inputClaveYT, setInputClaveYT] = useState('');
  const [errorClaveYT, setErrorClaveYT] = useState('');
  const [verificandoClaveYT, setVerificandoClaveYT] = useState(false);

  // Spotify (Modo Multiusuario Activo para Todos + Reproducción Completa Simultánea)
  const [spotifyToken, setSpotifyToken] = useState(() => localStorage.getItem('spotify_token') || '');
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [spotifySubTab, setSpotifySubTab] = useState('recomendadas'); // 'recomendadas' | 'buscar' | 'playlists' | 'link'
  const [spotifySearchQuery, setSpotifySearchQuery] = useState('');
  const [spotifySearchResults, setSpotifySearchResults] = useState(null);
  const [spotifyBuscando, setSpotifyBuscando] = useState(false);
  const [spotifyUserPlaylists, setSpotifyUserPlaylists] = useState([]);
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState('');
  const [spotifyInput, setSpotifyInput] = useState('');
  const [spotifyPlayerDeviceId, setSpotifyPlayerDeviceId] = useState('');
  const spotifyPlayerRef = useRef(null);
  const [spotifyError, setSpotifyError] = useState('');
  const [spotifySDKActivo, setSpotifySDKActivo] = useState(false);
  const [spotifyEstado, setSpotifyEstado] = useState(null);
  const [spotifyPos, setSpotifyPos] = useState(0);
  const spotifyDeviceRef = useRef('');
  const [portadasPL, setPortadasPL] = useState({});

  // Motor Multiusuario de Spotify (permite que varias personas escuchen canciones completas a la vez)
  const [spotifyPlaylistActiva, setSpotifyPlaylistActiva] = useState(PLAYLISTS_SPOTIFY_RECOMENDADAS[0]);
  const [spotifyPistasLista, setSpotifyPistasLista] = useState([]);
  const [spotifyCargandoLista, setSpotifyCargandoLista] = useState(false);
  const [spotifyTrackActual, setSpotifyTrackActual] = useState(null);
  const [spotifyCola, setSpotifyCola] = useState([]);
  const [spotifyIndiceCola, setSpotifyIndiceCola] = useState(0);
  const [spotifyPausadoMulti, setSpotifyPausadoMulti] = useState(false);
  const [spotifyCargandoAudio, setSpotifyCargandoAudio] = useState(false);
  const [spotifyDuracionMs, setSpotifyDuracionMs] = useState(0);
  const spotifyBgPlayerRef = useRef(null);
  const spotifyColaRef = useRef([]);
  const spotifyIndiceRef = useRef(0);

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
    try { spotifyPlayerRef.current?.pause(); } catch {}
    try { spotifyBgPlayerRef.current?.pauseVideo?.(); } catch {}
    setSpotifyPausadoMulti(true);
    setCurrent(url);
    setCurrentVideo(null);
    setCurrentVideoNube(null);
  };

  const reproducirVideoNube = video => {
    try { spotifyPlayerRef.current?.pause(); } catch {}
    try { spotifyBgPlayerRef.current?.pauseVideo?.(); } catch {}
    setSpotifyPausadoMulti(true);
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
    try { spotifyPlayerRef.current?.pause(); } catch {}
    try { spotifyBgPlayerRef.current?.pauseVideo?.(); } catch {}
    setSpotifyPausadoMulti(true);
    setCurrentVideo(videoId);
    setYtIndex(index);
    setYtPausado(false);
    setCurrentVideoNube(null);
    if (audioRef.current) audioRef.current.pause();
  };

  const togglePlayYouTube = () => {
    if (!ytPlayerRef.current) return;
    try {
      if (ytPausado) {
        ytPlayerRef.current.playVideo?.();
        setYtPausado(false);
      } else {
        ytPlayerRef.current.pauseVideo?.();
        setYtPausado(true);
      }
    } catch {}
  };

  const confirmarDesbloqueoYouTube = async () => {
    if (!inputClaveYT.trim()) {
      setErrorClaveYT('Por favor ingresa la contraseña o un pase temporal.');
      return;
    }
    setVerificandoClaveYT(true);
    setErrorClaveYT('');
    try {
      const r = await axios.post(`${API}/api/videos/desbloquear`, {
        carpeta: 'TODAS',
        clave: inputClaveYT.trim()
      });
      if (r.data?.ok) {
        setYtPantallaBloqueada(false);
        setModalDesbloquearYT(false);
        setInputClaveYT('');
      }
    } catch (e) {
      setErrorClaveYT(e.response?.data?.error || 'Contraseña incorrecta');
    }
    setVerificandoClaveYT(false);
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
          setCarpetasVideos(r.data.carpetas || []);
          setResumenCarpetasVideos(r.data.resumenCarpetas || []);
          setTotalVideosNube(r.data.totalVideos || 0);
        }
      })
      .catch(console.error);
  };

  const bloquearCarpetasVideos = () => {
    setVideosNube([]);
    setCarpetasDesbloqueadas([]);
    setCarpetaSeleccionada('');
    setCurrentVideoNube(null);
    setEsAdminVideos(false);
    setClaveAdminGuardada('');
    setExpiracionPaseMs(null);
    setModalGenerarPase(false);
    setPaseGenerado(null);
  };

  // Vigilar si un pase temporal caduca para bloquear automáticamente
  useEffect(() => {
    if (!expiracionPaseMs) return;
    const msRestantes = expiracionPaseMs - Date.now();
    if (msRestantes <= 0) {
      bloquearCarpetasVideos();
      return;
    }
    const timer = setTimeout(() => {
      bloquearCarpetasVideos();
      alert('⏳ El tiempo de tu pase temporal ha terminado. La carpeta se ha bloqueado nuevamente.');
    }, msRestantes);
    return () => clearTimeout(timer);
  }, [expiracionPaseMs]);

  const intentarAbrirCarpeta = nombreCarpeta => {
    if (carpetasDesbloqueadas.includes('*') || carpetasDesbloqueadas.includes(nombreCarpeta)) {
      setCarpetaSeleccionada(nombreCarpeta);
      setCurrentVideoNube(null);
    } else {
      setModalClaveCarpeta(nombreCarpeta);
      setInputClaveVideo('');
      setErrorClaveVideo('');
    }
  };

  const confirmarDesbloqueoCarpeta = async () => {
    if (!inputClaveVideo.trim()) {
      setErrorClaveVideo('Por favor escribe la contraseña o el código temporal.');
      return;
    }
    setVerificandoClave(true);
    setErrorClaveVideo('');
    try {
      const r = await axios.post(`${API}/api/videos/desbloquear`, {
        carpeta: modalClaveCarpeta,
        clave: inputClaveVideo.trim()
      });
      if (r.data?.ok) {
        setVideosNube(r.data.videos || []);
        if (r.data.todasLasCarpetas) {
          setCarpetasDesbloqueadas(['*']);
        } else {
          setCarpetasDesbloqueadas(prev => [...new Set([...prev, modalClaveCarpeta])]);
        }
        if (r.data.esAdmin) {
          setEsAdminVideos(true);
          setClaveAdminGuardada(inputClaveVideo.trim());
          setExpiracionPaseMs(null);
        } else if (r.data.expiraEnMs) {
          setExpiracionPaseMs(r.data.expiraEnMs);
        }
        setCarpetaSeleccionada(modalClaveCarpeta);
        setCurrentVideoNube(null);
        setModalClaveCarpeta('');
        setInputClaveVideo('');
      }
    } catch (e) {
      const msg = e.response?.data?.error || 'Contraseña o pase temporal incorrecto';
      setErrorClaveVideo(msg);
    }
    setVerificandoClave(false);
  };

  const generarPaseAdmin = async () => {
    try {
      const r = await axios.post(`${API}/api/videos/crear-pase`, {
        claveAdmin: claveAdminGuardada,
        carpeta: paseCarpetaDestino,
        minutos: paseMinutos
      });
      if (r.data?.ok) {
        setPaseGenerado(r.data);
        setCopiadoPase(false);
      }
    } catch (e) {
      alert(e.response?.data?.error || 'No se pudo generar el pase');
    }
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
            if (event.data === 1) {
              setYtPausado(false);
            } else if (event.data === 2) {
              setYtPausado(true);
            } else if (event.data === 0) {
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
    if (tab === 'youtube' && currentVideo && window.YT && window.YT.Player) {
      crearOActualizarYTPlayer();
    }
  }, [currentVideo, modoRadioYT, tab]);

  // Búsqueda en vivo en YouTube: actualiza sugerencias mientras escribes
  useEffect(() => {
    const q = ytSearchQuery.trim();
    if (!q) return;

    const directId = extraerIdYouTube(q);
    if (directId) {
      reproducirYouTube(directId);
      return;
    }

    let cancelado = false;
    const t = setTimeout(async () => {
      setYtBuscando(true);
      try {
        const r = await axios.get(`${API}/api/youtube/search`, { params: { q } });
        if (!cancelado && r.data?.items) {
          setYtVideos(r.data.items);
        }
      } catch (e) {
        console.error('Error en búsqueda dinámica de YouTube:', e);
      }
      if (!cancelado) setYtBuscando(false);
    }, 380);

    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [ytSearchQuery]);

  // Búsqueda en vivo estilo Spotify: busca mientras escribes SIN requerir inicio de sesión (Modo Multiusuario)
  useEffect(() => {
    const q = spotifySearchQuery.trim();
    if (!q) {
      setSpotifySearchResults(null);
      return;
    }
    let cancelado = false;
    const t = setTimeout(async () => {
      setSpotifyBuscando(true);
      try {
        const r = await axios.get(`${API}/api/spotify/search`, {
          params: { q }
        });
        if (!cancelado) {
          setSpotifySearchResults(r.data);
          setSpotifyError('');
        }
      } catch (e) {
        if (!cancelado) {
          const status = e.response?.status;
          setSpotifyError(`La búsqueda falló (${status || 'sin conexión'})`);
        }
      }
      if (!cancelado) setSpotifyBuscando(false);
    }, 320);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [spotifySearchQuery]);

  // Avance de la barra de progreso del reproductor Multiusuario de Spotify
  useEffect(() => {
    if (!spotifyTrackActual || spotifyPausadoMulti || spotifyCargandoAudio) return;
    const t = setInterval(() => {
      try {
        const curSec = spotifyBgPlayerRef.current?.getCurrentTime?.();
        if (typeof curSec === 'number' && !Number.isNaN(curSec) && curSec > 0) {
          setSpotifyPos(Math.floor(curSec * 1000));
          return;
        }
      } catch {}
      setSpotifyPos(p => p + 500);
    }, 500);
    return () => clearInterval(t);
  }, [spotifyTrackActual, spotifyPausadoMulti, spotifyCargandoAudio]);

  // Cargar canciones de la primera lista recomendada de Spotify al iniciar
  useEffect(() => {
    cargarListaSpotifyDestacada(PLAYLISTS_SPOTIFY_RECOMENDADAS[0], false);
  }, []);

  const cargarListaSpotifyDestacada = async (pl, autoReproducir = false) => {
    setSpotifyPlaylistActiva(pl);
    setSpotifyCargandoLista(true);
    setSpotifyError('');
    try {
      const r = await axios.get(`${API}/api/spotify/search`, {
        params: { q: pl.query || pl.titulo }
      });
      const pistas = r.data?.tracks?.items || [];
      setSpotifyPistasLista(pistas);
      if (autoReproducir && pistas.length > 0) {
        reproducirPistaSpotifyMulti(pistas[0], pistas, 0);
      }
    } catch (e) {
      console.error('Error cargando lista de Spotify:', e);
    }
    setSpotifyCargandoLista(false);
  };

  const reproducirPistaSpotifyMulti = async (track, cola = [], idx = 0) => {
    if (!track) return;
    if (audioRef.current) audioRef.current.pause();
    try { spotifyPlayerRef.current?.pause(); } catch {}
    setCurrentVideo(null);
    setCurrentVideoNube(null);
    setSpotifyEmbedUrl('');

    const listaEfectiva = cola && cola.length > 0 ? cola : [track];
    setSpotifyTrackActual(track);
    setSpotifyCola(listaEfectiva);
    setSpotifyIndiceCola(idx);
    spotifyColaRef.current = listaEfectiva;
    spotifyIndiceRef.current = idx;
    setSpotifyDuracionMs(track.duration_ms || 210000);
    setSpotifyPos(0);
    setSpotifyPausadoMulti(false);
    setSpotifyCargandoAudio(true);
    setSpotifyError('');

    const artistas = track.artists?.map(a => a.name).join(' ') || '';
    const consulta = `${track.name} ${artistas}`.trim();

    try {
      const r = await axios.get(`${API}/api/spotify/audio`, {
        params: { q: consulta }
      });
      const videoId = r.data?.videoId;
      if (!videoId) throw new Error('No se encontró fuente de audio para esta pista');

      // Esperar a que la API de YouTube esté lista si aún está cargando
      for (let i = 0; i < 20 && (!window.YT || !window.YT.Player); i++) {
        await new Promise(res => setTimeout(res, 200));
      }

      if (spotifyBgPlayerRef.current && typeof spotifyBgPlayerRef.current.loadVideoById === 'function') {
        spotifyBgPlayerRef.current.loadVideoById(videoId);
        spotifyBgPlayerRef.current.playVideo();
      } else if (window.YT && window.YT.Player) {
        spotifyBgPlayerRef.current = new window.YT.Player('spotify-hidden-audio-engine', {
          height: '1',
          width: '1',
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            playsinline: 1
          },
          events: {
            onReady: ev => {
              try {
                ev.target.setVolume(100);
                ev.target.playVideo();
              } catch {}
            },
            onStateChange: ev => {
              if (ev.data === 1) {
                setSpotifyCargandoAudio(false);
                setSpotifyPausadoMulti(false);
                try {
                  const durSec = ev.target.getDuration?.();
                  if (durSec && durSec > 0) setSpotifyDuracionMs(Math.floor(durSec * 1000));
                } catch {}
              } else if (ev.data === 2) {
                setSpotifyPausadoMulti(true);
              } else if (ev.data === 0) {
                // Avanzar automáticamente a la siguiente canción de la cola
                const c = spotifyColaRef.current || [];
                if (c.length > 0) {
                  const sigIdx = (spotifyIndiceRef.current + 1) % c.length;
                  reproducirPistaSpotifyMulti(c[sigIdx], c, sigIdx);
                }
              }
            }
          }
        });
      }
    } catch (e) {
      console.error('Error iniciando audio multiusuario Spotify:', e);
      setSpotifyCargandoAudio(false);
      setSpotifyError('No se pudo cargar el audio de esta canción, intenta con otra.');
    }
  };

  const togglePlaySpotifyMulti = () => {
    if (!spotifyBgPlayerRef.current) return;
    try {
      if (spotifyPausadoMulti) {
        spotifyBgPlayerRef.current.playVideo?.();
        setSpotifyPausadoMulti(false);
      } else {
        spotifyBgPlayerRef.current.pauseVideo?.();
        setSpotifyPausadoMulti(true);
      }
    } catch {}
  };

  const siguientePistaSpotifyMulti = () => {
    const c = spotifyColaRef.current || spotifyCola;
    if (!c || c.length === 0) return;
    const sigIdx = (spotifyIndiceRef.current + 1) % c.length;
    reproducirPistaSpotifyMulti(c[sigIdx], c, sigIdx);
  };

  const anteriorPistaSpotifyMulti = () => {
    const c = spotifyColaRef.current || spotifyCola;
    if (!c || c.length === 0) return;
    const antIdx = (spotifyIndiceRef.current - 1 + c.length) % c.length;
    reproducirPistaSpotifyMulti(c[antIdx], c, antIdx);
  };

  const adelantarSpotifyMulti = nuevoMs => {
    setSpotifyPos(nuevoMs);
    try {
      spotifyBgPlayerRef.current?.seekTo?.(Math.floor(nuevoMs / 1000), true);
    } catch {}
  };

  // --- SPOTIFY: Autenticación opcional, SDK y Funciones ---
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

    let cancelado = false;
    setSpotifyError('');
    axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${spotifyToken}` }
    }).then(r => {
      if (cancelado) return;
      setSpotifyUser(r.data);
      setSpotifyError('');
    }).catch(async err => {
      if (cancelado) return;
      const status = err.response?.status;
      if (status === 401) {
        const refresh = localStorage.getItem('spotify_refresh_token');
        if (refresh) {
          try {
            const rr = await axios.get(`${API}/api/spotify/refresh_token`, { params: { refresh_token: refresh } });
            if (rr.data?.access_token) {
              localStorage.setItem('spotify_token', rr.data.access_token);
              if (rr.data.refresh_token) localStorage.setItem('spotify_refresh_token', rr.data.refresh_token);
              setSpotifyToken(rr.data.access_token);
              return;
            }
          } catch {}
        }
        cerrarSesionSpotify();
      }
    });

    axios.get('https://api.spotify.com/v1/me/playlists?limit=30', {
      headers: { Authorization: `Bearer ${spotifyToken}` }
    }).then(r => {
      if (cancelado) return;
      setSpotifyUserPlaylists(r.data.items || []);
    }).catch(console.error);

    return () => {
      cancelado = true;
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
    setSpotifySDKActivo(false);
    setSpotifyEstado(null);
    if (spotifyPlayerRef.current) {
      try { spotifyPlayerRef.current.disconnect(); } catch {}
      spotifyPlayerRef.current = null;
    }
  };

  const pausarSpotify = () => {
    try { spotifyPlayerRef.current?.pause(); } catch {}
    try { spotifyBgPlayerRef.current?.pauseVideo?.(); } catch {}
    setSpotifyPausadoMulti(true);
  };

  const reproducirContextoSpotify = async (uriOrId, tipo = 'playlist') => {
    if (audioRef.current) audioRef.current.pause();
    try { spotifyBgPlayerRef.current?.pauseVideo?.(); } catch {}
    setSpotifyPausadoMulti(true);
    setSpotifyTrackActual(null);
    setCurrentVideo(null);
    setCurrentVideoNube(null);

    const uri = uriOrId.startsWith('spotify:') ? uriOrId : `spotify:${tipo}:${uriOrId}`;
    const [, tipoReal, id] = uri.split(':');
    setSpotifySDKActivo(false);
    setSpotifyEmbedUrl(`https://open.spotify.com/embed/${tipoReal}/${id}?utm_source=generator&theme=0`);
  };

  const buscarSpotify = async () => {
    if (!spotifySearchQuery.trim()) return;
    setSpotifyBuscando(true);
    setSpotifyError('');
    try {
      const r = await axios.get(`${API}/api/spotify/search`, {
        params: { q: spotifySearchQuery }
      });
      setSpotifySearchResults(r.data);
    } catch (e) {
      console.error('Error buscando en Spotify:', e);
      const status = e.response?.status;
      setSpotifyError(`La búsqueda falló (${status || 'sin conexión'})`);
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

  const videosFiltrados = carpetaSeleccionada
    ? videosNube.filter(v => v.carpeta === carpetaSeleccionada)
    : [];

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
            🎬 Mis Videos ({totalVideosNube || videosNube.length})
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

      {/* PESTAÑA: VIDEOS NUBE (CARPETAS PROTEGIDAS CON CONTRASEÑA Y PASE TEMPORAL) */}
      {tab === 'videos_nube' && (
        <section className="section-content">
          <div className="section-header">
            <div>
              <h2>🎬 Mis Videos en la Nube</h2>
              <p className="video-privacy-sub">
                {carpetaSeleccionada
                  ? `Carpeta abierta: 📁 ${carpetaSeleccionada}`
                  : 'Selecciona una carpeta e ingresa la contraseña o pase temporal para ver su contenido.'}
              </p>
            </div>

            <div className="video-security-actions">
              {carpetaSeleccionada && (
                <button
                  className="btn-control"
                  onClick={() => {
                    setCarpetaSeleccionada('');
                    setCurrentVideoNube(null);
                  }}
                >
                  ⬅ Volver a Carpetas
                </button>
              )}

              {esAdminVideos && (
                <button
                  className="btn-temp-pass"
                  onClick={() => {
                    setModalGenerarPase(true);
                    setPaseGenerado(null);
                  }}
                >
                  🔑 Crear Pase Temporal
                </button>
              )}

              {carpetasDesbloqueadas.length > 0 && (
                <button className="btn-lock-folders" onClick={bloquearCarpetasVideos}>
                  🔒 Bloquear Carpetas
                </button>
              )}
            </div>
          </div>

          {expiracionPaseMs && (
            <div className="temp-pass-active-banner">
              ⏳ Acceso con pase temporal activo (válido hasta las{' '}
              {new Date(expiracionPaseMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </div>
          )}

          {/* VISTA 1: LISTA DE CARPETAS CERRADAS / ABIERTAS */}
          {!carpetaSeleccionada ? (
            resumenCarpetasVideos.length === 0 ? (
              <div className="empty-notice">
                <p>No hay carpetas de videos registradas todavía.</p>
              </div>
            ) : (
              <div className="locked-folders-grid">
                {resumenCarpetasVideos.map(item => {
                  const desbloqueada =
                    carpetasDesbloqueadas.includes('*') || carpetasDesbloqueadas.includes(item.nombre);
                  return (
                    <div
                      key={item.nombre}
                      className={`locked-folder-card ${desbloqueada ? 'unlocked' : ''}`}
                      onClick={() => intentarAbrirCarpeta(item.nombre)}
                    >
                      <div className="locked-folder-icon-wrap">
                        <span className="locked-folder-emoji">📁</span>
                        <span className={`lock-status-pill ${desbloqueada ? 'open' : 'closed'}`}>
                          {desbloqueada ? '🔓 Desbloqueada' : '🔒 Con contraseña'}
                        </span>
                      </div>
                      <div className="locked-folder-info">
                        <h3>{item.nombre}</h3>
                        <span>
                          {item.total} {item.total === 1 ? 'video privado' : 'videos privados'}
                        </span>
                      </div>
                      <button className="btn-open-folder">
                        {desbloqueada ? 'Abrir carpeta →' : '🔑 Ingresar contraseña'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* VISTA 2: ADENTRO DE LA CARPETA DESBLOQUEADA */
            <>
              {currentVideoNube && (
                <div className="video-player-box">
                  <div className="video-header-bar">
                    <div>
                      <strong>🎬 {currentVideoNube.titulo}</strong>
                      <span className="video-folder-badge">📁 {currentVideoNube.carpeta}</span>
                    </div>
                    <div className="video-actions">
                      {currentVideoNube.tipo !== 'youtube' && (
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
                            <span className="badge-youtube-card">▶ Reproducir</span>
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
            </>
          )}

          {/* MODAL PARA INGRESAR CONTRASEÑA O PASE TEMPORAL */}
          {modalClaveCarpeta && (
            <div className="security-modal-backdrop" onClick={() => setModalClaveCarpeta('')}>
              <div className="security-modal-card" onClick={e => e.stopPropagation()}>
                <div className="security-modal-header">
                  <h3>🔒 Carpeta Privada: {modalClaveCarpeta}</h3>
                  <button className="modal-close-x" onClick={() => setModalClaveCarpeta('')}>
                    ✕
                  </button>
                </div>
                <p className="security-modal-desc">
                  Ingresa la contraseña o un código de pase temporal autorizado para abrir esta carpeta.
                </p>
                <input
                  type="password"
                  className="security-pass-input"
                  placeholder="Contraseña o Pase Temporal..."
                  value={inputClaveVideo}
                  onChange={e => setInputClaveVideo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmarDesbloqueoCarpeta()}
                  autoFocus
                />
                {errorClaveVideo && <div className="security-error-msg">⚠️ {errorClaveVideo}</div>}
                <div className="security-modal-footer">
                  <button className="btn-control" onClick={() => setModalClaveCarpeta('')}>
                    Cancelar
                  </button>
                  <button
                    className="btn-primary"
                    onClick={confirmarDesbloqueoCarpeta}
                    disabled={verificandoClave}
                  >
                    {verificandoClave ? 'Verificando...' : '🔓 Desbloquear'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL DE ADMINISTRADOR PARA CREAR PASES TEMPORALES */}
          {modalGenerarPase && esAdminVideos && (
            <div className="security-modal-backdrop" onClick={() => setModalGenerarPase(false)}>
              <div className="security-modal-card" onClick={e => e.stopPropagation()}>
                <div className="security-modal-header">
                  <h3>🔑 Generador de Pase Temporal</h3>
                  <button className="modal-close-x" onClick={() => setModalGenerarPase(false)}>
                    ✕
                  </button>
                </div>
                <p className="security-modal-desc">
                  Crea un código temporal para compartir con un invitado sin revelar tu contraseña maestra.
                </p>

                <label className="security-field-label">¿A qué carpeta tendrá acceso?</label>
                <select
                  className="security-select"
                  value={paseCarpetaDestino}
                  onChange={e => setPaseCarpetaDestino(e.target.value)}
                >
                  <option value="TODAS">🔓 Todas las carpetas</option>
                  {carpetasVideos.map(c => (
                    <option key={c} value={c}>
                      📁 Solo: {c}
                    </option>
                  ))}
                </select>

                <label className="security-field-label">¿Cuánto tiempo durará el pase?</label>
                <select
                  className="security-select"
                  value={paseMinutos}
                  onChange={e => setPaseMinutos(Number(e.target.value))}
                >
                  <option value={15}>⏱️ 15 minutos</option>
                  <option value={30}>⏱️ 30 minutos</option>
                  <option value={60}>⏱️ 1 hora</option>
                  <option value={180}>⏱️ 3 horas</option>
                  <option value={1440}>⏱️ 24 horas (1 día)</option>
                </select>

                <button className="btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={generarPaseAdmin}>
                  ✨ Generar Código Temporal
                </button>

                {paseGenerado && (
                  <div className="generated-pass-box">
                    <span className="generated-pass-label">CÓDIGO TEMPORAL LISTO:</span>
                    <div className="generated-pass-code">{paseGenerado.codigo}</div>
                    <span className="generated-pass-exp">
                      Caduca automáticamente a las{' '}
                      {new Date(paseGenerado.expiraEnMs).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <div className="generated-pass-buttons">
                      <button
                        className="btn-copy-pass"
                        onClick={() => {
                          navigator.clipboard.writeText(paseGenerado.codigo);
                          setCopiadoPase(true);
                        }}
                      >
                        {copiadoPase ? '✅ ¡Copiado!' : '📋 Copiar código'}
                      </button>
                      <a
                        className="btn-whatsapp-pass"
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Hola, aquí tienes tu código temporal para ver los videos en el reproductor: *${paseGenerado.codigo}* (válido por ${paseGenerado.minutos} min)`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📲 Enviar por WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* PESTAÑA: YOUTUBE (DISEÑO IDÉNTICO A YOUTUBE + CORTINA ANTI-DISTRACCIÓN PROTEGIBLE CON CONTRASEÑA) */}
      {tab === 'youtube' && (() => {
        const videoActivoObj = ytVideos.find(v => v.id.videoId === currentVideo) || ytVideos[0];
        return (
          <section className="section-content yt-watch-section">
            {/* Barra superior estilo YouTube con buscador en vivo */}
            <div className="yt-top-bar">
              <div className="yt-brand-logo">
                <span className="yt-logo-icon">▶</span>
                <span className="yt-logo-text">YouTube</span>
                <span className="yt-logo-country">MX</span>
              </div>

              <div className="yt-live-search-box">
                <input
                  type="text"
                  placeholder="Buscar en YouTube (escribe y saldrán las sugerencias al instante)..."
                  value={ytSearchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    setYtSearchQuery(val);
                    if (!val.trim()) cargarSugerenciasYouTube();
                  }}
                />
                {ytSearchQuery && (
                  <button
                    className="yt-search-clear"
                    onClick={() => {
                      setYtSearchQuery('');
                      cargarSugerenciasYouTube();
                    }}
                    title="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
                <button className="yt-search-btn" title="Buscar">
                  {ytBuscando ? '⏳' : '🔍'}
                </button>
              </div>

              {/* Botón de Modo Operativo: Desbloquear o volver a Tapar Pantalla */}
              <div>
                {ytPantallaBloqueada ? (
                  <button
                    className="btn-temp-pass"
                    onClick={() => {
                      setModalDesbloquearYT(true);
                      setInputClaveYT('');
                      setErrorClaveYT('');
                    }}
                    title="Desbloquear imagen del video con contraseña"
                  >
                    🔑 Desbloquear Video
                  </button>
                ) : (
                  <button
                    className="btn-lock-folders"
                    onClick={() => setYtPantallaBloqueada(true)}
                    title="Volver a tapar la pantalla de video para evitar distracciones"
                  >
                    🙈 Tapar Pantalla (Modo Operativo)
                  </button>
                )}
              </div>
            </div>

            <div className="yt-watch-layout">
              {/* Columna Izquierda: Pantalla principal (con Cortina Anti-Distracción) y controles */}
              <div className="yt-watch-main">
                {currentVideo ? (
                  <div className="yt-embed-container">
                    <div id="youtube-player-container" />

                    {/* CORTINA ANTI-DISTRACCIÓN SOBRE LA PANTALLA DE VIDEO */}
                    {ytPantallaBloqueada && (
                      <div className="yt-nodistraction-curtain">
                        <span className="yt-curtain-badge">🔒 MODO OPERATIVO • SOLO AUDIO ACTIVO</span>
                        <div className="yt-curtain-icon">🎧</div>
                        <h3 className="yt-curtain-title">¡No te distraigas! 🎶</h3>
                        <p className="yt-curtain-desc">
                          La música sigue sonando para acompañarte en tus actividades sin distracciones visuales.
                          Puedes cambiar de canción o buscar más música en la lista de la derecha.
                        </p>
                        {videoActivoObj && (
                          <div className="yt-curtain-nowplaying">
                            {ytPausado ? '⏸ En pausa:' : '🎵 Sonando ahora:'}{' '}
                            <strong>{videoActivoObj.snippet.title}</strong>
                          </div>
                        )}
                        <div className="yt-curtain-actions">
                          <button className="btn-primary" onClick={togglePlayYouTube}>
                            {ytPausado ? '▶ Reanudar Música' : '⏸ Pausar Música'}
                          </button>
                          <button
                            className="btn-control"
                            onClick={() => {
                              setModalDesbloquearYT(true);
                              setInputClaveYT('');
                              setErrorClaveYT('');
                            }}
                          >
                            🔑 Desbloquear Video
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="yt-embed-container yt-placeholder-screen"
                    onClick={() => ytVideos[0] && reproducirYouTube(ytVideos[0].id.videoId, 0)}
                  >
                    <div className="yt-nodistraction-curtain" style={{ cursor: 'pointer' }}>
                      <span className="yt-curtain-badge">🎧 MODO OPERATIVO • SIN DISTRACCIÓN</span>
                      <div className="yt-big-play-btn" style={{ margin: '10px 0' }}>▶</div>
                      <h3 className="yt-curtain-title">¡No te distraigas! Escucha tu música aquí</h3>
                      <p className="yt-curtain-desc">
                        Haz clic aquí o elige cualquier canción de las sugerencias a la derecha para empezar a escuchar.
                      </p>
                    </div>
                  </div>
                )}

                <div className="yt-watch-info">
                  <h2 className="yt-watch-title">
                    {videoActivoObj ? videoActivoObj.snippet.title : 'Videos de YouTube'}
                  </h2>

                  <div className="yt-watch-meta-bar">
                    <div className="yt-channel-badge">
                      <div className="yt-channel-avatar">▶</div>
                      <div>
                        <div className="yt-channel-title">
                          {videoActivoObj?.snippet?.channelTitle || 'YouTube Music'}
                        </div>
                        <div className="yt-channel-sub">
                          {ytPantallaBloqueada ? '🔒 Video cubierto (Solo Audio)' : '🔓 Video visible'}
                        </div>
                      </div>
                    </div>

                    <div className="yt-controls-bar">
                      <button className="btn-control" onClick={anteriorYouTube} disabled={!currentVideo}>
                        ⏮ Anterior
                      </button>
                      {currentVideo && (
                        <button className="btn-control" onClick={togglePlayYouTube}>
                          {ytPausado ? '▶ Reproducir' : '⏸ Pausar'}
                        </button>
                      )}
                      <button className="btn-control" onClick={siguienteYouTube} disabled={!currentVideo}>
                        Siguiente Recomendada ⏭
                      </button>
                      <button
                        className={`btn-mode-toggle ${modoRadioYT ? 'active' : ''}`}
                        onClick={() => setModoRadioYT(!modoRadioYT)}
                        title="Cambia entre reproducir sugerencias de YouTube o la lista buscada"
                      >
                        {modoRadioYT ? '📻 Radio Sugerencias: ACTIVADO' : '📋 Lista Búsqueda: FIJA'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Lista de videos sugeridos / Mix */}
              <aside className="yt-watch-sidebar">
                <div className="yt-mix-header">
                  <h3>
                    {ytBuscando
                      ? `Buscando "${ytSearchQuery}"...`
                      : ytSearchQuery.trim()
                        ? `Resultados: ${ytSearchQuery}`
                        : videoActivoObj
                          ? `Mix: ${videoActivoObj.snippet.title}`
                          : 'Videos sugeridos'}
                  </h3>
                  <p>
                    {ytSearchQuery.trim()
                      ? `${ytVideos.length} videos encontrados en vivo`
                      : 'Los mixes son playlists que crea YouTube para ti'}
                  </p>
                </div>

                <div className="yt-sidebar-list">
                  {ytVideos.map((v, idx) => {
                    const esActivo = v.id.videoId === currentVideo;
                    return (
                      <div
                        key={v.id.videoId}
                        className={`yt-sidebar-card ${esActivo ? 'active' : ''}`}
                        onClick={() => reproducirYouTube(v.id.videoId, idx)}
                      >
                        <span className="yt-sidebar-index">{esActivo ? '▶' : idx + 1}</span>
                        <div className="yt-sidebar-thumb">
                          <img src={v.snippet.thumbnails.default.url} alt={v.snippet.title} />
                          {v.snippet.duration && (
                            <span className="yt-duration-badge">{v.snippet.duration}</span>
                          )}
                        </div>
                        <div className="yt-sidebar-info">
                          <h4 title={v.snippet.title}>{v.snippet.title}</h4>
                          <span className="yt-sidebar-channel">
                            {v.snippet.channelTitle || 'YouTube'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>

            {/* MODAL PARA DESBLOQUEAR LA PANTALLA DE VIDEO DE YOUTUBE CON CONTRASEÑA */}
            {modalDesbloquearYT && (
              <div className="security-modal-backdrop" onClick={() => setModalDesbloquearYT(false)}>
                <div className="security-modal-card" onClick={e => e.stopPropagation()}>
                  <div className="security-modal-header">
                    <h3>🔓 Desbloquear Pantalla de YouTube</h3>
                    <button className="modal-close-x" onClick={() => setModalDesbloquearYT(false)}>
                      ✕
                    </button>
                  </div>
                  <p className="security-modal-desc">
                    Ingresa tu contraseña maestra o un código de pase temporal para quitar la cubierta y ver el video en pantalla.
                  </p>
                  <input
                    type="password"
                    className="security-pass-input"
                    placeholder="Contraseña o Pase Temporal..."
                    value={inputClaveYT}
                    onChange={e => setInputClaveYT(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmarDesbloqueoYouTube()}
                    autoFocus
                  />
                  {errorClaveYT && <div className="security-error-msg">⚠️ {errorClaveYT}</div>}
                  <div className="security-modal-footer">
                    <button className="btn-control" onClick={() => setModalDesbloquearYT(false)}>
                      Cancelar
                    </button>
                    <button
                      className="btn-primary"
                      onClick={confirmarDesbloqueoYouTube}
                      disabled={verificandoClaveYT}
                    >
                      {verificandoClaveYT ? 'Verificando...' : '🔓 Mostrar Video'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })()}

      {/* PESTAÑA: SPOTIFY (MODO PREMIUM MULTIUSUARIO ACTIVO PARA TODOS) */}
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
                  Catálogo Oficial • Reproducción Completa Simultánea sin cortes
                </span>
              </div>
            </div>

            {/* Insignia Premium Multiusuario Activo para Todos los Visitantes */}
            <div className="spotify-user-actions">
              <div className="spotify-profile-badge">
                <div className="spotify-avatar-fallback" style={{ background: '#1DB954', color: '#000', fontWeight: 800 }}>
                  ★
                </div>
                <div className="spotify-profile-info">
                  <span className="spotify-user-name">
                    {spotifyUser?.display_name || 'Cuenta Cloud Activa'}
                  </span>
                  <span className="badge-subscription premium">
                    👑 PREMIUM MULTIUSUARIO
                  </span>
                </div>
              </div>
            </div>
          </div>

          {spotifyError && (
            <div style={{ background: '#3a1a1a', border: '1px solid #e22134', color: '#ffb3b3', borderRadius: 8, padding: '10px 14px', margin: '10px 0', fontSize: 14 }}>
              ⚠️ {spotifyError}
            </div>
          )}

          {/* Buscador en Vivo Permanente arriba de Spotify */}
          <div className="spotify-search-bar" style={{ marginBottom: 18 }}>
            <input
              placeholder="🔍 ¿Qué canción o artista quieres escuchar hoy? Escribe aquí y saldrá al instante..."
              value={spotifySearchQuery}
              onChange={e => {
                setSpotifySearchQuery(e.target.value);
                if (e.target.value.trim() && spotifySubTab !== 'buscar') {
                  setSpotifySubTab('buscar');
                }
              }}
              onKeyDown={e => e.key === 'Enter' && buscarSpotify()}
            />
            {spotifySearchQuery && (
              <button
                className="btn-spotify-logout"
                onClick={() => {
                  setSpotifySearchQuery('');
                  setSpotifySearchResults(null);
                  setSpotifySubTab('recomendadas');
                }}
              >
                ✕ Limpiar
              </button>
            )}
            <button
              className="btn-spotify-small"
              onClick={() => {
                setSpotifySubTab('buscar');
                buscarSpotify();
              }}
              disabled={spotifyBuscando}
            >
              {spotifyBuscando ? 'Buscando...' : 'Buscar'}
            </button>
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
              🔍 Resultados de Búsqueda
            </button>
            <button
              className={`pill-btn ${spotifySubTab === 'link' ? 'active' : ''}`}
              onClick={() => setSpotifySubTab('link')}
            >
              🔗 Pegar Enlace Directo
            </button>
          </div>

          {/* Reproductor Multiusuario de Spotify (Canciones Completas para Varios Usuarios a la vez) */}
          {spotifyTrackActual ? (() => {
            const dur = spotifyDuracionMs || spotifyTrackActual.duration_ms || 210000;
            const fmt = ms => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
            return (
              <div
                className="spotify-active-embed-box"
                style={{
                  background: 'linear-gradient(135deg,#193b27,#121212)',
                  border: '1px solid rgba(29,185,84,0.35)',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  gap: 20,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginBottom: 22
                }}
              >
                <img
                  src={spotifyTrackActual.album?.images?.[0]?.url || spotifyTrackActual.album?.images?.[2]?.url}
                  alt={spotifyTrackActual.name}
                  style={{ width: 135, height: 135, borderRadius: 10, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 12, color: '#1DB954', fontWeight: 700, letterSpacing: 1 }}>
                    {spotifyCargandoAudio
                      ? '⏳ CONECTANDO AUDIO COMPLETO...'
                      : '🟢 REPRODUCIENDO EN SPOTIFY • MODO MULTIUSUARIO'}
                  </div>
                  <h2 style={{ margin: '6px 0 2px', fontSize: 24 }}>{spotifyTrackActual.name}</h2>
                  <div style={{ color: '#b3b3b3', marginBottom: 14 }}>
                    {spotifyTrackActual.artists?.map(a => a.name).join(', ')}
                    {spotifyTrackActual.album?.name ? ` • ${spotifyTrackActual.album.name}` : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#b3b3b3', width: 38 }}>{fmt(spotifyPos)}</span>
                    <input
                      type="range"
                      min={0}
                      max={dur}
                      value={Math.min(spotifyPos, dur)}
                      onChange={e => adelantarSpotifyMulti(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#1DB954', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 12, color: '#b3b3b3', width: 38 }}>{fmt(dur)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 12 }}>
                    <button
                      onClick={anteriorPistaSpotifyMulti}
                      title="Canción anterior"
                      style={{ background: 'none', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer' }}
                    >
                      ⏮
                    </button>
                    <button
                      onClick={togglePlaySpotifyMulti}
                      title={spotifyPausadoMulti ? 'Reproducir' : 'Pausar'}
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#1DB954',
                        color: '#000',
                        fontSize: 22,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {spotifyCargandoAudio ? '⏳' : spotifyPausadoMulti ? '▶' : '⏸'}
                    </button>
                    <button
                      onClick={siguientePistaSpotifyMulti}
                      title="Siguiente canción"
                      style={{ background: 'none', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer' }}
                    >
                      ⏭
                    </button>
                  </div>
                </div>
              </div>
            );
          })() : spotifyEmbedUrl && (
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

          {/* Vista 1: RECOMENDADAS + LISTA DE CANCIONES DE LA PLAYLIST SELECCIONADA */}
          {spotifySubTab === 'recomendadas' && (
            <div className="spotify-content-block">
              <h3 className="spotify-section-heading">Listas de reproducción destacadas (haz clic para escuchar)</h3>
              <div className="spotify-grid">
                {PLAYLISTS_SPOTIFY_RECOMENDADAS.map(pl => {
                  const activa = spotifyPlaylistActiva?.id === pl.id;
                  return (
                    <div
                      key={pl.id}
                      className="spotify-card"
                      style={activa ? { outline: '2px solid #1DB954', background: '#242424' } : undefined}
                      onClick={() => cargarListaSpotifyDestacada(pl, true)}
                    >
                      <div className="spotify-card-cover-wrap">
                        <div
                          className="spotify-card-img"
                          style={{
                            background: pl.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 56,
                            aspectRatio: '1 / 1',
                            borderRadius: 8
                          }}
                        >
                          {pl.emoji}
                        </div>
                        <button className="spotify-play-hover-btn" title="Reproducir lista completa">
                          ▶
                        </button>
                      </div>
                      <div className="spotify-card-text">
                        <h4>{pl.titulo}</h4>
                        <p>{pl.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Canciones de la lista destacada seleccionada */}
              {spotifyPlaylistActiva && (
                <div className="spotify-results-section" style={{ marginTop: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    <h3 className="spotify-section-heading" style={{ margin: 0 }}>
                      {spotifyPlaylistActiva.emoji} Canciones de: {spotifyPlaylistActiva.titulo}
                    </h3>
                    {spotifyPistasLista.length > 0 && (
                      <button
                        className="btn-spotify-small"
                        onClick={() => reproducirPistaSpotifyMulti(spotifyPistasLista[0], spotifyPistasLista, 0)}
                      >
                        ▶ Reproducir toda la lista
                      </button>
                    )}
                  </div>

                  {spotifyCargandoLista ? (
                    <p className="empty-notice">Cargando canciones de {spotifyPlaylistActiva.titulo}...</p>
                  ) : (
                    <div className="spotify-tracks-table">
                      {spotifyPistasLista.map((t, idx) => {
                        const esActiva = spotifyTrackActual?.id === t.id;
                        return (
                          <div
                            key={`${t.id}-${idx}`}
                            className="spotify-track-row"
                            style={esActiva ? { background: 'rgba(29,185,84,0.18)', borderLeft: '3px solid #1DB954' } : undefined}
                            onClick={() => reproducirPistaSpotifyMulti(t, spotifyPistasLista, idx)}
                          >
                            <span className="track-idx" style={esActiva ? { color: '#1DB954', fontWeight: 800 } : undefined}>
                              {esActiva ? '▶' : idx + 1}
                            </span>
                            <img
                              src={t.album?.images?.[2]?.url || t.album?.images?.[0]?.url}
                              alt={t.name}
                              className="spotify-track-thumb"
                            />
                            <div className="spotify-track-names">
                              <span className="track-title-bold" style={esActiva ? { color: '#1DB954' } : undefined}>
                                {t.name}
                              </span>
                              <span className="track-artist-sub">{t.artists?.map(a => a.name).join(', ')}</span>
                            </div>
                            <span className="track-album-sub">{t.album?.name}</span>
                            <span className="track-dur">
                              {Math.floor((t.duration_ms || 0) / 60000)}:
                              {String(Math.floor(((t.duration_ms || 0) % 60000) / 1000)).padStart(2, '0')}
                            </span>
                            <button className="btn-play-row" title="Reproducir canción completa">
                              {esActiva && !spotifyPausadoMulti ? '⏸' : '▶'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Vista 2: RESULTADOS DEL BUSCADOR EN VIVO */}
          {spotifySubTab === 'buscar' && (
            <div className="spotify-content-block">
              {!spotifySearchQuery.trim() ? (
                <p className="empty-notice">
                  Escribe el nombre de cualquier canción, artista o grupo en el buscador de arriba para escucharla completa al instante.
                </p>
              ) : spotifyBuscando && !spotifySearchResults ? (
                <p className="empty-notice">Buscando "{spotifySearchQuery}" en el catálogo de Spotify...</p>
              ) : (
                spotifySearchResults?.tracks?.items && (
                  <div className="spotify-results-section">
                    <h3 className="spotify-section-heading">
                      Canciones encontradas para "{spotifySearchQuery}" (clic para escuchar completa)
                    </h3>
                    <div className="spotify-tracks-table">
                      {spotifySearchResults.tracks.items.map((t, idx) => {
                        const esActiva = spotifyTrackActual?.id === t.id;
                        return (
                          <div
                            key={`${t.id}-${idx}`}
                            className="spotify-track-row"
                            style={esActiva ? { background: 'rgba(29,185,84,0.18)', borderLeft: '3px solid #1DB954' } : undefined}
                            onClick={() =>
                              reproducirPistaSpotifyMulti(t, spotifySearchResults.tracks.items, idx)
                            }
                          >
                            <span className="track-idx" style={esActiva ? { color: '#1DB954', fontWeight: 800 } : undefined}>
                              {esActiva ? '▶' : idx + 1}
                            </span>
                            <img
                              src={t.album?.images?.[2]?.url || t.album?.images?.[0]?.url}
                              alt={t.name}
                              className="spotify-track-thumb"
                            />
                            <div className="spotify-track-names">
                              <span className="track-title-bold" style={esActiva ? { color: '#1DB954' } : undefined}>
                                {t.name}
                              </span>
                              <span className="track-artist-sub">{t.artists?.map(a => a.name).join(', ')}</span>
                            </div>
                            <span className="track-album-sub">{t.album?.name}</span>
                            <span className="track-dur">
                              {Math.floor((t.duration_ms || 0) / 60000)}:
                              {String(Math.floor(((t.duration_ms || 0) % 60000) / 1000)).padStart(2, '0')}
                            </span>
                            <button className="btn-play-row" title="Reproducir">
                              {esActiva && !spotifyPausadoMulti ? '⏸' : '▶'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Vista 3: PEGAR ENLACE DIRECTO */}
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

      {/* Motor invisible de audio para reproducción simultánea multiusuario de Spotify */}
      <div
        style={{
          width: 1,
          height: 1,
          opacity: 0,
          position: 'fixed',
          bottom: 0,
          right: 0,
          pointerEvents: 'none',
          overflow: 'hidden'
        }}
      >
        <div id="spotify-hidden-audio-engine" />
      </div>
    </div>
  );
}



