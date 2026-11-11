// Acceso a un bucket PRIVADO de Backblaze B2 con enlaces temporales.
// Se activa si existen B2_KEY_ID, B2_APP_KEY y B2_BUCKET_NAME en .env
import fetch from 'node-fetch';

const PREFIX_MUSICA = 'musica/';
const PREFIX_VIDEOS = 'videos/';
const DURACION_ENLACE = 12 * 3600; // segundos

let cacheMusica = null;
let cacheVideos = null;

export const b2Activo = () =>
  Boolean(process.env.B2_KEY_ID && process.env.B2_APP_KEY && process.env.B2_BUCKET_NAME);

async function post(api, token, ruta, body) {
  const r = await fetch(`${api}/b2api/v3/${ruta}`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`B2 ${ruta}: ${data.message || r.status}`);
  return data;
}

async function conectar() {
  const basic = Buffer.from(`${process.env.B2_KEY_ID}:${process.env.B2_APP_KEY}`).toString('base64');
  const r = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    headers: { Authorization: `Basic ${basic}` }
  });
  const auth = await r.json();
  if (!r.ok) throw new Error(`B2 authorize: ${auth.message || r.status}`);

  const storage = auth.apiInfo.storageApi;
  const bucketName = process.env.B2_BUCKET_NAME;
  let bucketId = storage.allowed?.buckets?.find(b => b.name === bucketName)?.id;
  if (!bucketId) {
    const lista = await post(storage.apiUrl, auth.authorizationToken, 'b2_list_buckets', {
      accountId: auth.accountId,
      bucketName
    });
    bucketId = lista.buckets?.[0]?.bucketId;
  }
  if (!bucketId) throw new Error(`No se encontro el bucket "${bucketName}"`);

  return { api: storage.apiUrl, downloadUrl: storage.downloadUrl, token: auth.authorizationToken, bucketId, bucketName };
}

async function listarArchivos(sesion, prefix, extensiones) {
  const files = [];
  let startFileName = null;
  do {
    const page = await post(sesion.api, sesion.token, 'b2_list_file_names', {
      bucketId: sesion.bucketId,
      prefix,
      maxFileCount: 1000,
      ...(startFileName && { startFileName })
    });
    files.push(
      ...page.files
        .map(f => f.fileName)
        .filter(n => extensiones.some(ext => n.toLowerCase().endsWith(ext)))
    );
    startFileName = page.nextFileName;
  } while (startFileName);
  return files.sort((a, b) => a.localeCompare(b));
}

// Devuelve las URLs reproducibles de todas las canciones MP3
export async function pistasB2() {
  if (cacheMusica && cacheMusica.expira > Date.now()) return cacheMusica.urls;

  const sesion = await conectar();
  const files = await listarArchivos(sesion, PREFIX_MUSICA, ['.mp3']);
  const { authorizationToken } = await post(sesion.api, sesion.token, 'b2_get_download_authorization', {
    bucketId: sesion.bucketId,
    fileNamePrefix: PREFIX_MUSICA,
    validDurationInSeconds: DURACION_ENLACE
  });

  const urls = files.map(n => {
    const ruta = n.split('/').map(encodeURIComponent).join('/');
    return `${sesion.downloadUrl}/file/${sesion.bucketName}/${ruta}?Authorization=${authorizationToken}`;
  });

  cacheMusica = { urls, expira: Date.now() + (DURACION_ENLACE - 600) * 1000 };
  return urls;
}

// Devuelve los videos organizados por carpetas (ej: "VIERNES SOCIAL-2024", etc.)
export async function videosB2() {
  if (cacheVideos && cacheVideos.expira > Date.now()) return cacheVideos.data;

  const sesion = await conectar();
  const files = await listarArchivos(sesion, PREFIX_VIDEOS, ['.mp4', '.webm', '.mov', '.mkv']);
  
  if (files.length === 0) {
    return { carpetas: ['Todas'], videos: [] };
  }

  const { authorizationToken } = await post(sesion.api, sesion.token, 'b2_get_download_authorization', {
    bucketId: sesion.bucketId,
    fileNamePrefix: PREFIX_VIDEOS,
    validDurationInSeconds: DURACION_ENLACE
  });

  const carpetasSet = new Set();

  const videos = files.map(n => {
    // Estructura: videos/CARPETA/nombre-del-video.mp4 o videos/nombre.mp4
    const partes = n.replace(/^videos\//, '').split('/');
    let carpeta = 'General';
    let archivo = partes[0];

    if (partes.length > 1) {
      carpeta = partes[0];
      archivo = partes.slice(1).join('/');
    }

    carpetasSet.add(carpeta);

    const titulo = decodeURIComponent(archivo).replace(/\.(mp4|webm|mov|mkv)$/i, '');
    const ruta = n.split('/').map(encodeURIComponent).join('/');
    const url = `${sesion.downloadUrl}/file/${sesion.bucketName}/${ruta}?Authorization=${authorizationToken}`;

    return {
      url,
      titulo,
      carpeta,
      archivo
    };
  });

  const carpetas = ['Todas', ...Array.from(carpetasSet).sort()];
  const data = { carpetas, videos };

  cacheVideos = { data, expira: Date.now() + (DURACION_ENLACE - 600) * 1000 };
  return data;
}
