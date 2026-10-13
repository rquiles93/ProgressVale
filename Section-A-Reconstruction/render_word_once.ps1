$ErrorActionPreference='Stop'
$input=(Resolve-Path -LiteralPath '.\Section-A-Reconstruction\ABLLS_R_Section_A_Reconstructed.docx').Path
$output=[IO.Path]::Combine((Resolve-Path -LiteralPath '.\Section-A-Reconstruction').Path,'ABLLS_R_Section_A_Reconstructed.pdf')
Write-Output 'Starting Word'
$word=New-Object -ComObject Word.Application
Write-Output 'Word started'
$word.Visible=$false; $word.DisplayAlerts=0
try {
  $doc=$word.Documents.Open($input,$false,$true)
  Write-Output 'Document opened'
  try { $doc.ExportAsFixedFormat($output,17); Write-Output 'PDF exported' } finally { $doc.Close($false) }
} finally { $word.Quit() }
