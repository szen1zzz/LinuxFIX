param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\sounds')
)

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

function Write-ToneSequence {
  param(
    [string]$Name,
    [array]$Notes,
    [int]$SampleRate = 44100
  )

  $samples = New-Object System.Collections.Generic.List[double]
  foreach ($note in $Notes) {
    $frequency = [double]$note[0]
    $duration = [double]$note[1]
    $volume = [double]$note[2]
    $sampleCount = [int]($SampleRate * $duration)
    for ($index = 0; $index -lt $sampleCount; $index++) {
      $position = $index / [double]$SampleRate
      $attack = [Math]::Min(1.0, $index / ($SampleRate * 0.012))
      $release = [Math]::Min(1.0, ($sampleCount - $index) / ($SampleRate * 0.07))
      $envelope = $attack * $release
      $fundamental = [Math]::Sin(2 * [Math]::PI * $frequency * $position)
      $harmonic = 0.18 * [Math]::Sin(2 * [Math]::PI * ($frequency * 2) * $position)
      $samples.Add(($fundamental + $harmonic) * $volume * $envelope)
    }
  }

  $path = Join-Path $resolvedOutput $Name
  $stream = [System.IO.File]::Create($path)
  $writer = New-Object System.IO.BinaryWriter($stream)
  try {
    $dataLength = $samples.Count * 2
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('RIFF'))
    $writer.Write(36 + $dataLength)
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('WAVE'))
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('fmt '))
    $writer.Write(16)
    $writer.Write([int16]1)
    $writer.Write([int16]1)
    $writer.Write($SampleRate)
    $writer.Write($SampleRate * 2)
    $writer.Write([int16]2)
    $writer.Write([int16]16)
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('data'))
    $writer.Write($dataLength)
    foreach ($sample in $samples) {
      $clamped = [Math]::Max(-1.0, [Math]::Min(1.0, $sample))
      $writer.Write([int16]($clamped * 32767))
    }
  }
  finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

Write-ToneSequence -Name 'boot.wav' -Notes @(
  @(196.00, 0.10, 0.14),
  @(293.66, 0.10, 0.16),
  @(440.00, 0.17, 0.18)
)

Write-ToneSequence -Name 'connected.wav' -Notes @(
  @(659.25, 0.08, 0.15),
  @(987.77, 0.16, 0.18)
)

Write-ToneSequence -Name 'switch.wav' -Notes @(
  @(523.25, 0.055, 0.10),
  @(783.99, 0.075, 0.11)
)
