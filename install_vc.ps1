# Download VC++ Redistributable
$url = "https://aka.ms/vs/17/release/vc_redist.x64.exe"
$output = "C:\Windows\Temp\vc_redist.x64.exe"

try {
    Write-Host "Downloading VC++ Redistributable..."
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing

    Write-Host "Installing VC++ Redistributable..."
    $process = Start-Process -FilePath $output -ArgumentList "/install", "/quiet", "/norestart" -Wait -PassThru

    Write-Host "Exit code: $($process.ExitCode)"
} catch {
    Write-Host "Error: $_"
}