// Acceso a un bucket PRIVADO de Backblaze B2 con enlaces temporales.
// Se activa si existen B2_KEY_ID, B2_APP_KEY y B2_BUCKET_NAME en .env
import fetch from 'node-fetch';

const PREFIX = 'musica/';
const DURACION_ENLACE = 12 * 3600; // segundos
let cache = null; // { api, downloadUrl, bucketId, bucketName, files, expira }

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

async function listarArchivos(sesion) {
  const files = [];
  let startFileName = null;
  do {
    const page = await post(sesion.api, sesion.token, 'b2_list_file_names', {
      bucketId: sesion.bucketId,
      prefix: PREFIX,
      maxFileCount: 1000,
      ...(startFileName && { startFileName })
    });
    files.push(...page.files.map(f => f.fileName).filter(n => n.toLowerCase().endsWith('.mp3')));
    startFileName = page.nextFileName;
  } while (startFileName);
  return files.sort((a, b) => a.localeCompare(b));
}

// Devuelve las URLs reproducibles (con enlace temporal) de todas las canciones.
export async function pistasB2() {
  if (cache && cache.expira > Date.now()) return cache.urls;

  const sesion = await conectar();
  const files = await listarArchivos(sesion);
  const { authorizationToken } = await post(sesion.api, sesion.token, 'b2_get_download_authorization', {
    bucketId: sesion.bucketId,
    fileNamePrefix: PREFIX,
    validDurationInSeconds: DURACION_ENLACE
  });

  const urls = files.map(n => {
    const ruta = n.split('/').map(encodeURIComponent).join('/');
    return `${sesion.downloadUrl}/file/${sesion.bucketName}/${ruta}?Authorization=${authorizationToken}`;
  });
  // Renovamos antes de que venza el enlace
  cache = { urls, expira: Date.now() + (DURACION_ENLACE - 600) * 1000 };
  return urls;
}

