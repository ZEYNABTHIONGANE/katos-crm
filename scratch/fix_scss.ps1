$path = 'c:\Users\Hp\Desktop\katos-crm\src\styles\pages\_crm.scss'
$content = Get-Content $path -Raw
# Remove null bytes if they exist
$content = $content.Replace("`0", "")
# Split by lines
$lines = $content -split "`r?`n"
# Keep only up to line 3764
$fixedLines = $lines[0..3763]
# Save as UTF8
[System.IO.File]::WriteAllLines($path, $fixedLines, [System.Text.UTF8Encoding]($false))
