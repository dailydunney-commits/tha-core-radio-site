# Tha Core Clean Audio Gate Working Baseline

Saved point:
SmartDJ, AutoDJ, and Global Audio Gate safety system are now working structurally.

## Working now

### SmartDJ
- SmartDJ finds songs.
- If a clean version is found, it can build a playlist.
- If no clean version is found, raw dirty audio is blocked.
- Dirty or unknown tracks go to Bleep Jobs / Clean Copy Queue.
- SmartDJ no longer saves an empty playlist when a bleep job is created.
- Completed bleep jobs can link clean/bleeped audio back to SmartDJ playlist.
- Test clean file:
  /audio/smartdj/test-bleeped-clean.mp3

### Bleep Job
- Bleep jobs can store:
  - processedAudioUrl
  - bleepedAudioUrl
  - cleanAudioUrl
  - radioSafeAudioUrl
  - safeAudioUrl
- Bleep jobs can reach:
  PROCESSED_AUDIO_READY

### AutoDJ
- /api/autodj/safety-check is online.
- /api/autodj/gated-next is online.
- AutoDJ gated-next can approve clean/processed/bleeped audio.
- Dirty/raw/unverified candidates can be held before rotation.

### Global Audio Gate
- /api/radio/global-audio-gate is online.
- Safe processed audio passes.
- Dirty/raw audio is blocked.
- This is the main rule going forward:
  All audio must be clean, radio-safe, or processed/bleeped before listeners hear it.

## Not done yet

### Real audio bleeping
The system can store and use a processed/bleeped file, but it does not yet automatically generate real word-by-word bleeped audio from a dirty MP3.

### Azura direct handoff
We have NOT wired approved tracks into Azura queue yet.
Do not patch Azura queue until the exact safe endpoint is confirmed.

### Listener stream gate
If listeners use the direct Azura stream URL, audio can still bypass the control panel.
Final goal:
Source audio -> Tha Core Global Audio Gate -> Approved clean/bleeped audio -> Azura/listener output.

## Rule going forward

No huge patches.
One file at a time.
Backup before every patch.
Test after every patch.
Do not touch Azura until the current safe gate is backed up and verified.
