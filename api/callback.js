export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) {
    const error = req.query.error || 'access_denied';
    return res.redirect(`/#spotify_error=${encodeURIComponent(error)}`);
  }

  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'https://reproductor-musica-sigma.vercel.app/callback';

  try {
    const fetchFn = typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default;
    const response = await fetchFn(tokenUrl, {
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

    // Redirigir al inicio de la aplicación pasando los tokens en el hash
    return res.redirect(`/#spotify_token=${encodeURIComponent(data.access_token)}&refresh_token=${encodeURIComponent(data.refresh_token || '')}`);
  } catch (err) {
    console.error('Error en callback:', err);
    return res.status(500).send('Error interno en autenticación Spotify: ' + err.message);
  }
}
