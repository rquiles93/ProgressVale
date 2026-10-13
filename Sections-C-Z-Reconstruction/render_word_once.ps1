$ErrorActionPreference = 'Stop'
$inputPath = (Resolve-Path '.\Sections-C-Z-Reconstruction\ABLLS_R_Sections_C_to_Z_Complete.docx').Path
$outputPath = Join-Path (Split-Path $inputPath) 'ABLLS_R_Sections_C_to_Z_Complete.pdf'
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
