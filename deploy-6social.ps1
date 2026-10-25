# 6social.pages.dev 배포: 캐시·검사·원본을 뺀 복사본을 만들어 Cloudflare Pages 프로젝트 6social에 올린다.
# 실행: powershell -ExecutionPolicy Bypass -File .\deploy-6social.ps1   (wrangler 로그인은 ~/.wrangler/config에 이미 있음)
$src = $PSScriptRoot; $dst = Join-Path $env:TEMP "deploy6"
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
$skipDirs = 'output','node_modules','__pycache__','.python-packages','uv-cache','.npm-cache','check-verify','shots','check','_imgtest','raw','tests','src','.git','.claude'
$skipFiles = 'sfx-demo.html','game-sound-demo.html','title-mock.html','art_compare.png','.gitignore','deploy-6social.ps1'
Get-ChildItem -Path $src -Recurse -File | Where-Object {
  $rel = $_.FullName.Substring($src.Length + 1); $parts = $rel.Split('\')
  -not ($parts[0..($parts.Length - 2)] | Where-Object { $skipDirs -contains $_ }) -and ($skipFiles -notcontains $_.Name) -and ($_.Extension -notin '.md','.log','.py')
} | ForEach-Object {
  $rel = $_.FullName.Substring($src.Length + 1); $to = Join-Path $dst $rel
  New-Item -ItemType Directory -Force (Split-Path $to) | Out-Null; Copy-Item $_.FullName $to
}
Write-Host ("files: " + (Get-ChildItem $dst -Recurse -File).Count)
Set-Location $dst
npx -y wrangler@latest pages deploy . --project-name 6social --commit-dirty=true
