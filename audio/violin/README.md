# Orbital Violin Samples

Copy WAV files from the provided Drive folder into this structure, replacing the tiny placeholder WAVs currently committed for local testing:

```text
audio/violin/
  legato/
    solo_01.wav
  balkan/
    phrase_01.wav
  short/
    spiccato_01.wav
  long/
    drone_01.wav
```

Orbital Violin loads samples defensively. Missing files will not crash the page; the audio engine uses a quiet development fallback if a sample is absent or cannot be decoded.
