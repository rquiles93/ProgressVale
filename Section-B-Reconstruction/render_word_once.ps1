$ErrorActionPreference = 'Stop'
$inputPath = (Resolve-Path '.\Section-B-Reconstruction\ABLLS_R_Section_B_Reconstructed.docx').Path
$outputPath = Join-Path (Split-Path $inputPath) 'ABLLS_R_Section_B_Reconstructed.pdf'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open($inputPath, $false, $true)
    $doc.ExportAsFixedFormat($outputPath, 17)
    $doc.Close($false)
} finally {
    $word.Quit()
}
Write-Output $outputPath
