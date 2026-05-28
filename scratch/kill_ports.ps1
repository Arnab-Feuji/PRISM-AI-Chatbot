$ports = @(8000, 5177, 5178)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            Write-Output "Killing process $procId using port $port"
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}
# Sleep for a moment to let OS release the ports
Start-Sleep -Seconds 2
Write-Output "Ports freed."
