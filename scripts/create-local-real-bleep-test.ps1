$ErrorActionPreference = "Stop"

$root = "C:\Projects\tha-core-radio-site"
Set-Location $root

Write-Host "Checking ffmpeg..."
try {
  ffmpeg -version | Out-Null
  Write-Host "FFMPEG FOUND"
} catch {
  Write-Host "FFMPEG MISSING - STOP. Install ffmpeg before real bleep processing."
  exit 1
}

$keyLine = Get-Content ".env.local" -ErrorAction SilentlyContinue | Where-Object { $_ -match "^OPENAI_API_KEY=" } | Select-Object -First 1
if (!$keyLine) {
  Write-Host "OPENAI_API_KEY MISSING in .env.local - STOP."
  exit 1
}

New-Item -ItemType Directory -Force -Path ".data\bleep-input" | Out-Null

$testAudio = Join-Path $root ".data\bleep-input\authorized-local-bleep-test.wav"

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0
$synth.Volume = 100
$synth.SetOutputToWaveFile($testAudio)
$synth.Speak("Tha Core clean processor test. This line has one bad word. Fuck. End of test.")
$synth.SetOutputToDefaultAudioDevice()
$synth.Dispose()

Write-Host "AUTHORIZED TEST AUDIO CREATED:"
Write-Host $testAudio

$jobId = "local-real-bleep-test-001"
$jobsPath = Join-Path $root ".data\bleep-jobs.json"

$job = [ordered]@{
  id = $jobId
  jobId = $jobId
  source = "SMARTDJ"
  title = "Authorized Local Real Bleep Test"
  artist = "Tha Core Test"
  status = "BLEEP_JOB_CREATED"
  decision = "TEST_REAL_TRANSCRIBE_PROCESS"
  safe = $false
  needsBleep = $true
  sourceFilePath = $testAudio
  createdAt = (Get-Date).ToString("o")
  updatedAt = (Get-Date).ToString("o")
  message = "Authorized local test job for real transcribe plus bleep processing."
}

$data = $null
$containerIsArray = $false

if (Test-Path $jobsPath) {
  $raw = Get-Content $jobsPath -Raw
  if ($raw.Trim().Length -gt 0) {
    $data = $raw | ConvertFrom-Json
  }
}

if ($null -eq $data) {
  $data = [pscustomobject]@{ jobs = @() }
}

if ($data -is [array]) {
  $containerIsArray = $true
  $jobs = @($data | Where-Object { $_ -ne $null })
} elseif ($data.PSObject.Properties.Name -contains "jobs") {
  $jobs = @($data.jobs | Where-Object { $_ -ne $null })
} else {
  $jobs = @()
  $data = [pscustomobject]@{ jobs = @() }
}

$jobs = @($jobs | Where-Object { $_.jobId -ne $jobId -and $_.id -ne $jobId })
$jobs += [pscustomobject]$job

if ($containerIsArray) {
  $jobs | ConvertTo-Json -Depth 30 | Set-Content $jobsPath -Encoding UTF8
} else {
  $data.jobs = $jobs
  $data | ConvertTo-Json -Depth 30 | Set-Content $jobsPath -Encoding UTF8
}

Write-Host "TEST BLEEP JOB CREATED:"
Write-Host "JOB ID: $jobId"
Write-Host "DONE"
