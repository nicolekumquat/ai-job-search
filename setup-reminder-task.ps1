param(
    [Parameter(Mandatory = $true)]
    [string]$To,

    [string]$TaskName = "AIJobSearch-Reminder",
    [string]$Time = "06:30"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $repoRoot "scripts\job-reminder.ps1"

if (-not (Test-Path $scriptPath)) {
    throw "Reminder script not found: $scriptPath"
}

if ($Time -notmatch '^([01]\d|2[0-3]):([0-5]\d)$') {
    throw "Time must be HH:mm (24-hour), for example 06:30"
}

$hour = [int]$matches[1]
$minute = [int]$matches[2]
$start = (Get-Date).Date.AddHours($hour).AddMinutes($minute)
if ($start -lt (Get-Date)) {
    $start = $start.AddDays(1)
}

$actionArgs = "-ExecutionPolicy Bypass -File `"$scriptPath`" -To `"$To`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionArgs -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $start
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
} catch {}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Description "Daily AI job search reminder email" | Out-Null

Write-Host "Scheduled task created: $TaskName"
Write-Host "Runs daily at $Time"
Write-Host "Target email: $To"
Write-Host "Reminder script: $scriptPath"
Write-Host "Test now with: powershell -ExecutionPolicy Bypass -File scripts/job-reminder.ps1 -To `"$To`""
