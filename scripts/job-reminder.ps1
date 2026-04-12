<#
.SYNOPSIS
    Sends a daily job-search reminder email from .local-user/tasks.md and .local-user/Job-Tracker.md.

.DESCRIPTION
    - Parses open checkbox tasks in .local-user/tasks.md
    - Flags due/overdue/upcoming/action items
    - Flags stale active jobs from Job-Tracker.md (14+ days since last update)
    - Sends a simple HTML summary via Outlook COM

.PARAMETER ProjectRoot
    Root folder of the repository. Defaults to parent of this script folder.

.PARAMETER To
    Recipient email address.

.PARAMETER DryRun
    Build reminder content but do not send email.
#>

param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$To = "you@example.com",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$TasksPath = Join-Path $ProjectRoot ".local-user\tasks.md"
$TrackerPath = Join-Path $ProjectRoot ".local-user\Job-Tracker.md"
$LogDir = Join-Path $ProjectRoot "scripts\logs"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-ddTHHmmss"
$logFile = Join-Path $LogDir "reminder-$timestamp.log"

function Log {
    param([string]$Message)

    $entry = "$(Get-Date -Format o) $Message"
    $entry | Add-Content -Path $logFile
    Write-Host $entry
}

function Parse-DueDate {
    param([string]$TaskText)

    if ($TaskText -match '@due:([0-9]{4}-[0-9]{2}-[0-9]{2})') {
        try {
            return [DateTime]::Parse($matches[1])
        }
        catch {
            return $null
        }
    }

    return $null
}

function Get-OpenTasks {
    if (-not (Test-Path $TasksPath)) {
        throw "tasks.md not found at $TasksPath"
    }

    $lines = Get-Content $TasksPath
    $tasks = @()
    $section = "General"

    foreach ($line in $lines) {
        if ($line -match '^##\s+(.+)$') {
            $section = $matches[1].Trim()
            continue
        }

        if ($line -match '^\- \[ \]\s+(.+)$') {
            $raw = $matches[1].Trim()
            $priority = 4

            if ($raw -match '^P(\d)\s*[:\-]\s*') {
                $priority = [int]$matches[1]
            }

            $title = ($raw -replace '\s*@\w+:[^\s]+', '').Trim()
            $dueDate = Parse-DueDate -TaskText $raw

            $tasks += [PSCustomObject]@{
                Section = $section
                Title = $title
                Priority = $priority
                DueDate = $dueDate
                Raw = $raw
            }
        }
    }

    return $tasks
}

function Get-StaleJobs {
    if (-not (Test-Path $TrackerPath)) {
        return @()
    }

    $today = (Get-Date).Date
    $stale = @()

    $lines = Get-Content $TrackerPath
    foreach ($line in $lines) {
        if ($line -notmatch '^\|') { continue }
        if ($line -match '^\|\s*-') { continue }
        if ($line -match '^\|\s*ID\s*\|') { continue }
        if ($line -match '~~') { continue }

        $cols = $line -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
        if ($cols.Count -lt 6) { continue }

        $id = $cols[0]
        $company = $cols[1]
        $dateText = $cols[4]
        $status = $cols[5]

        if ($status -match 'Closed|Archived') { continue }

        $lastDate = $null
        try {
            $lastDate = [DateTime]::Parse($dateText)
        }
        catch {
            continue
        }

        $days = ($today - $lastDate.Date).Days
        if ($days -ge 14) {
            $stale += [PSCustomObject]@{
                Job = "$id - $company"
                Status = "STALE"
                Action = "No update in $days days (last: $($lastDate.ToString('yyyy-MM-dd')); status: $status)"
                Priority = 4
            }
        }
    }

    return $stale
}

function Build-ReminderRows {
    param([array]$Tasks)

    $today = (Get-Date).Date
    $rows = @()

    foreach ($task in $Tasks) {
        if ($task.Section -match '^(Completed|Done|About This Project)$') {
            continue
        }

        if ($task.DueDate) {
            $days = ($task.DueDate.Date - $today).Days
            if ($days -lt 0) {
                $rows += [PSCustomObject]@{ Job = $task.Section; Status = "OVERDUE"; Action = "$($task.Title) (due $($task.DueDate.ToString('M/d')))"; Priority = 1 }
            }
            elseif ($days -eq 0) {
                $rows += [PSCustomObject]@{ Job = $task.Section; Status = "TODAY"; Action = $task.Title; Priority = 1 }
            }
            elseif ($days -eq 1) {
                $rows += [PSCustomObject]@{ Job = $task.Section; Status = "TOMORROW"; Action = $task.Title; Priority = 2 }
            }
            elseif ($days -le 3) {
                $rows += [PSCustomObject]@{ Job = $task.Section; Status = "UPCOMING"; Action = "$($task.Title) (due $($task.DueDate.ToString('M/d')))"; Priority = 3 }
            }
        }
        elseif ($task.Priority -eq 1) {
            $rows += [PSCustomObject]@{ Job = $task.Section; Status = "ACTION"; Action = $task.Title; Priority = 2 }
        }
    }

    return $rows | Sort-Object Priority, Job
}

function Get-StudyItems {
    param([array]$Tasks)

    return $Tasks |
        Where-Object { $_.Section -match '^Study' } |
        ForEach-Object {
            [PSCustomObject]@{
                Job = ($_.Section -replace '^Study\s*[-:]?\s*', '').Trim()
                Topic = $_.Title
            }
        }
}

function Status-BadgeHtml {
    param([string]$Status)

    $color = switch ($Status) {
        "OVERDUE" { "#d63031" }
        "TODAY" { "#e17055" }
        "TOMORROW" { "#f39c12" }
        "ACTION" { "#0078d4" }
        "UPCOMING" { "#6c5ce7" }
        "STALE" { "#636e72" }
        default { "#636e72" }
    }

    return "<span style='background:$color;color:#ffffff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;'>$Status</span>"
}

function Build-ReminderHtml {
    param(
        [array]$Rows,
        [array]$StudyItems
    )

    $tableRows = ""
    foreach ($r in $Rows) {
        $badge = Status-BadgeHtml -Status $r.Status
        $tableRows += @"
<tr style='border-bottom:1px solid #ececec;'>
  <td style='padding:8px 10px;font-family:Segoe UI;font-size:14px;font-weight:600;'>$($r.Job)</td>
  <td style='padding:8px 10px;font-family:Segoe UI;font-size:12px;'>$badge</td>
  <td style='padding:8px 10px;font-family:Segoe UI;font-size:14px;'>$($r.Action)</td>
</tr>
"@
    }

    $studyHtml = ""
    if ($StudyItems.Count -gt 0) {
        $grouped = $StudyItems | Group-Object Job
        $studyRows = ""
        foreach ($g in $grouped) {
            $topics = ($g.Group | ForEach-Object { $_.Topic }) -join "<br>"
            $label = if ([string]::IsNullOrWhiteSpace($g.Name)) { "General" } else { $g.Name }
            $studyRows += @"
<tr style='border-bottom:1px solid #ececec;'>
  <td style='padding:8px 10px;font-family:Segoe UI;font-size:14px;font-weight:600;'>$label</td>
  <td style='padding:8px 10px;font-family:Segoe UI;font-size:14px;'>$topics</td>
</tr>
"@
        }

        $studyHtml = @"
<p style='font-family:Segoe UI;font-size:15px;font-weight:700;color:#6c5ce7;margin:16px 0 8px 0;'>Study Items</p>
<table style='width:100%;border-collapse:collapse;'>
  <tr style='border-bottom:2px solid #6c5ce7;'>
    <th style='text-align:left;padding:8px 10px;font-family:Segoe UI;font-size:12px;color:#666;text-transform:uppercase;'>Job</th>
    <th style='text-align:left;padding:8px 10px;font-family:Segoe UI;font-size:12px;color:#666;text-transform:uppercase;'>Topics to Study</th>
  </tr>
  $studyRows
</table>
"@
    }

    $generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm"

    return @"
<div style='font-family:Segoe UI,Arial,sans-serif;color:#222;'>
  <p style='font-size:14px;margin:0 0 10px 0;'>Job Search reminder summary</p>
  <table style='width:100%;border-collapse:collapse;'>
    <tr style='border-bottom:2px solid #0078d4;'>
      <th style='text-align:left;padding:8px 10px;font-family:Segoe UI;font-size:12px;color:#666;text-transform:uppercase;'>Job</th>
      <th style='text-align:left;padding:8px 10px;font-family:Segoe UI;font-size:12px;color:#666;text-transform:uppercase;'>Status</th>
      <th style='text-align:left;padding:8px 10px;font-family:Segoe UI;font-size:12px;color:#666;text-transform:uppercase;'>Action</th>
    </tr>
    $tableRows
  </table>
  $studyHtml
  <p style='font-family:Segoe UI;font-size:12px;color:#999;margin-top:12px;'>Generated $generatedAt from .local-user/tasks.md + .local-user/Job-Tracker.md</p>
</div>
"@
}

Log "Starting reminder build"
Log "ProjectRoot: $ProjectRoot"

$tasks = Get-OpenTasks
$rows = Build-ReminderRows -Tasks $tasks
$rows += Get-StaleJobs
$rows = $rows | Sort-Object Priority, Job
$study = Get-StudyItems -Tasks $tasks

Log "Open tasks parsed: $($tasks.Count)"
Log "Reminder rows: $($rows.Count)"
Log "Study items: $($study.Count)"

if ($rows.Count -eq 0 -and $study.Count -eq 0) {
    Log "Nothing to send. Exiting."
    exit 0
}

$html = Build-ReminderHtml -Rows $rows -StudyItems $study
$subject = "Job Search: $($rows.Count + $study.Count) items need attention"

if ($DryRun) {
    $previewFile = Join-Path $LogDir "reminder-preview-$timestamp.html"
    $html | Set-Content -Path $previewFile
    Log "DryRun enabled. Preview written to $previewFile"
    Log "Subject: $subject"
    exit 0
}

try {
    Log "Sending via Outlook COM to $To"
    $outlook = New-Object -ComObject Outlook.Application
    $mail = $outlook.CreateItem(0)
    $mail.To = $To
    $mail.Subject = $subject
    $mail.HTMLBody = $html
    $mail.Send()
    Log "Email sent"
}
catch {
    Log "Outlook send failed: $($_.Exception.Message)"
    throw
}

Log "Done"
