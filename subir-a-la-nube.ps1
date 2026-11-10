# Uso:  .\subir-a-la-nube.ps1 -Proyecto "mi-proyecto-id" -Bucket "mi-musica-unico-123"
param(
  [Parameter(Mandatory=$true)][string]$Proyecto,
  [Parameter(Mandatory=$true)][string]$Bucket,
  [string]$Carpeta = "C:\Users\Cord_Contraloria\Music\MUSICA MP3",
  [string]$Region = "us-central1"
)
$ErrorActionPreference = "Stop"

gcloud config set project $Proyecto
gcloud services enable storage.googleapis.com

# Crear bucket (si no existe)
gcloud storage buckets describe "gs://$Bucket" 2>$null
if ($LASTEXITCODE -ne 0) {
  gcloud storage buckets create "gs://$Bucket" --location=$Region --uniform-bucket-level-access
}

# Subir solo los MP3 (rsync: si lo repites, sube solo lo nuevo)
gcloud storage rsync $Carpeta "gs://$Bucket/musica" --recursive

# Lectura pública para poder reproducir desde el navegador
gcloud storage buckets add-iam-policy-binding "gs://$Bucket" --member=allUsers --role=roles/storage.objectViewer

# CORS para que la página pueda reproducir los audios
$cors = '[{"origin":["*"],"method":["GET","HEAD"],"responseHeader":["Content-Type","Range"],"maxAgeSeconds":3600}]'
$tmp = Join-Path $env:TEMP "cors.json"
Set-Content -Path $tmp -Value $cors
gcloud storage buckets update "gs://$Bucket" --cors-file=$tmp

Write-Host "`nListo. Agrega esto a backend\.env :"
Write-Host "MUSIC_BASE_URL=https://storage.googleapis.com/$Bucket/musica"
