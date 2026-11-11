# Reproductor Multimedia en la Nube 🎵🎬

Plataforma multimedia moderna alojada 24/7 en la nube (Vercel) con streaming ilimitado sin costo ni tarjetas.

- **URL de Producción:** [https://reproductor-musica-sigma.vercel.app](https://reproductor-musica-sigma.vercel.app)
- **Repositorio GitHub:** [https://github.com/respaldosmichelle2022-ui/reproductor-musica](https://github.com/respaldosmichelle2022-ui/reproductor-musica)

---

## 🚀 Características Principales

1. **☁️ Mi Música (MP3)**:
   - 113 canciones alojadas en GitHub Releases (`v1.0.0-musica`) con streaming continuo `HTTP 206`.
   - Soporte para subcarpetas por géneros musicales (`ROMANTICAS`, `GRUPERAS`, `BALADAS`, etc.).
   - Modo aleatorio (Shuffle), repetir y lista persistente de Favoritas (❤️).

2. **🎬 Mis Videos (Eventos)**:
   - Videos locales en calidad original intacta (1080p Full HD) en GitHub Releases (`v1.0.0-videos`).
   - Soporte para **videos de YouTube en modo no listado/oculto** (hasta 256 GB / 12 horas por video sin límites de disco).
   - Clasificación por eventos con selector de carpetas (`VIERNES SOCIAL-2024`, `POSADA-2026`, etc.).

3. **▶ YouTube con Radio Automático**:
   - Búsqueda sin API keys ni facturación (cero cuotas de Google).
   - Sugerencias automáticas en la pantalla de inicio.
   - Modo Radio continuo inteligente: al terminar una canción sigue reproduciendo recomendaciones similares sin repetir versiones.
   - Detección de enlaces directos de YouTube en el buscador.

4. **🟢 Spotify**:
   - Integración para reproducir listas, álbumes y pistas de Spotify.

---

## 📁 Cómo Agregar Nuevo Contenido (100% Autónomo)

En la carpeta principal `C:\PROYECTOS\REPRODUCTOR DE MUSICA\`:

1. **Para Música**: Pega tus archivos `.mp3` en `CANCIONES MP3` (puedes crear subcarpetas por género).
2. **Para Videos**:
   - Pega tus archivos `.mp4` en `VIDEOS` (creando subcarpetas por evento).
   - O agrega enlaces de YouTube en `VIDEOS\ENLACES_YOUTUBE.txt` o en notas `.txt` dentro de la subcarpeta del evento.
3. **Ejecuta `SUBIR_CONTENIDO_A_LA_NUBE.bat`**:
   - Detecta automáticamente lo nuevo, lo sube a la nube y actualiza Vercel al instante.
   - Una vez subido, puedes borrar los archivos locales si deseas liberar espacio en tu disco duro.
