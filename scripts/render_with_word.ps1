param([string]$InputDir,[string]$OutputRoot)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  Get-ChildItem -LiteralPath $InputDir -Filter '*.docx' | ForEach-Object {
    $dest = Join-Path $OutputRoot $_.BaseName
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    $pdf = Join-Path $dest ($_.BaseName + '.pdf')
    $doc = $word.Documents.Open($_.FullName, $false, $true)
    try { $doc.ExportAsFixedFormat($pdf, 17) } finally { $doc.Close($false) }
  }
} finally { $word.Quit() }
