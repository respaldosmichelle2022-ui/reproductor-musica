# Uso:  .\subir-a-backblaze.ps1 -KeyId "xxxx" -AppKey "xxxx" -Bucket "nombre-de-tu-bucket"
# Requiere la herramienta "b2" (CLI de Backblaze) instalada.
param(
  [Parameter(Mandatory=$true)][string]$KeyId,
  [Parameter(Mandatory=$true)][string]$AppKey,
  [Parameter(Mandatory=$true)][string]$Bucket,
  [string]$Carpeta = "C:\Users\Cord_Contraloria\Music\MUSICA MP3"
)
$ErrorActionPreference = "Stop"

$b2 = Join-Path $PSScriptRoot ".b2venv\Scripts\b2.exe"
if (-not (Test-Path $b2)) {
  Write-Host "Falta la herramienta 'b2'. Avisale a Antigravity para instalarla."
  exit 1
}

& $b2 account authorize $KeyId $AppKey
# sync solo sube lo nuevo o cambiado, se puede repetir sin problema
& $b2 sync --include-regex ".*\.mp3$" --exclude-regex ".*" $Carpeta "b2://$Bucket/musica"

Write-Host "`nListo. En Backblaze abre un archivo subido y copia su 'Friendly URL'."
Write-Host "La parte antes de /musica/ es tu MUSIC_BASE_URL (agrega /musica al final)."

