$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$envFile = Join-Path $projectRoot '.env.local'
$exampleFile = Join-Path $projectRoot '.env.example'

if (!(Test-Path $envFile)) {
  Copy-Item $exampleFile $envFile
}

$hashLine = 'ADMIN_PASSWORD_HASH=pbkdf2_sha256\$210000\$a4f6aa1938eb175b71c4bb7f6a2e641c\$a084516b5143b344e73e260ea95c4ca1129c89545287fa605146cdcecafadd13'
$b64Line = 'ADMIN_PASSWORD_HASH_B64=cGJrZGYyX3NoYTI1NiQyMTAwMDAkYTRmNmFhMTkzOGViMTc1YjcxYzRiYjdmNmEyZTY0MWMkYTA4NDUxNmI1MTQzYjM0NGU3M2UyNjBlYTk1YzRjYTExMjljODk1NDUyODdmYTYwNTE0NmNkY2VjYWZhZGQxMw=='

$lines = Get-Content $envFile -ErrorAction SilentlyContinue | Where-Object {
  ($_ -notmatch '^ADMIN_PASSWORD_HASH=') -and ($_ -notmatch '^ADMIN_PASSWORD_HASH_B64=')
}

$lines + $hashLine + $b64Line | Set-Content $envFile -Encoding UTF8

$localAuth = Join-Path $projectRoot '.data\auth.json'
if (Test-Path $localAuth) {
  Remove-Item $localAuth -Force
}

Write-Host 'Login env sudah diperbaiki.'
Write-Host 'Username: admin'
Write-Host 'Password: admin12345'
Write-Host 'Jalankan ulang server dengan: npm run dev'
