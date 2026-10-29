# Demo RFID scanner: sends card scans to the server like the NodeMCU does.
# Usage (PowerShell, from the project folder):  .\demo\demo-scan.ps1
# Run it only while a lecture is open (scan window or after teacher clicks "Allow scanning").

$server = "http://localhost:8000/api/scan"
$room   = "R101"
$key    = $env:DEVICE_KEY          # leave empty if DEVICE_KEY is not set on the server

$headers = @{ "Content-Type" = "application/json" }
if ($key) { $headers["x-device-key"] = $key }

$cards = @("04A31B2C","04A31B2D","04A31B2E","04B71C3A","04B71C3B","FFFFFFFF")  # last one = unregistered card

foreach ($uid in $cards) {
    $body = @{ uid = $uid; room = $room } | ConvertTo-Json
    try {
        $r = Invoke-RestMethod -Uri $server -Method Post -Headers $headers -Body $body
        Write-Host "[OK]    $uid -> $($r.message) ($($r.name), $($r.subject))" -ForegroundColor Green
    } catch {
        $msg = $_.ErrorDetails.Message
        Write-Host "[DENIED] $uid -> $msg" -ForegroundColor Yellow
    }
    Start-Sleep -Milliseconds 800
}
