# ✦ Piyaster Piano

A single-page, Synthesia-style neon piano that runs in the browser. It has no build step and no dependencies, and it makes its sound with the Web Audio API.

## Features
- On-screen piano with 5 octaves on desktop, 4 on tablets and 3 on phones. The range grows automatically to fit the loaded song.
- Play it with the mouse or touch (multi-touch and glissando) or with the computer keyboard: `A W S E D F T G Y H U J K O L P ; '`. `Z`/`X` shift the octave and `Space` pauses.
- Type a song name and press **Play**. The built-in library has 16 public-domain or traditional melodies, and names are matched loosely, so "fur elise" or "twinkel" still work.
- You can also type notes directly: `C4 D4 E4:2 R G4+B4+D5:2`, where `:beats` sets the length, `R` is a rest and `+` makes a chord.
- ABC notation is supported, for example `X:1\nL:1/8\nK:C\nCDEF GABc`.
- You can load a `.mid` file. Drum tracks are skipped.
- Neon note bars fall toward the keys, and keys light up in a matching color with a glow and spark particles when hit.
- Play, pause and stop buttons, a tempo slider (0.4–2×) and a volume slider.
- If the app doesn't know a song name, it shows a friendly message suggesting songs it does have.
- Deep link: `index.html?song=ode+to+joy&seek=2`

## Sound
- Real grand piano sound from **Salamander Grand Piano** samples. 30 samples (every minor third, A0 to C8, about 2 MB of MP3) are bundled in `samples/`, and notes in between are pitch-shifted from the nearest sample.
- Notes get louder and brighter the harder they're played (velocity), and they release naturally.
- 🦶 **Sustain** pedal: use the toggle button, or **hold Shift** as the pedal (Space is play/pause).
- 🏛 **Hall** toggles a subtle concert-hall reverb.
- A loading badge shows progress until the samples are ready. Audio unlocks on the first tap, which iOS requires.
- If the samples can't load, the app falls back to the built-in synth.

## Two hands
- Every built-in song has a left-hand accompaniment, such as the Alberti bass under *Für Elise*, the walking bass in *Canon in D* and chords under *Ode to Joy*.
- The right hand is shown in **cyan** and the left hand in **magenta**. The legend has RH and LH mute toggles.
- Type both hands in the song box: `RH: E4 D4 C4 D4 E4 E4 E4:2  LH: C3+E3+G3:2 G2+B2+D3:2`
- MIDI import plays every track and channel. Two-part files are split into RH and LH by pitch, and files with more parts are colored per track.

## My Songs (your own music)
The app ships only public-domain or traditional melodies. For anything else, such as songs by the Beatles or music from Final Fantasy or Studio Ghibli, **you supply your own files**:
- Drag a `.mid` file onto the page or use **🎵 MIDI**. The app plays it and asks you for a name.
- Or paste notes or ABC into the box, press Play, then press **💾 Save**.
Saved songs are kept in your browser's `localStorage` (key `neonPiano.mySongs`). They show up under **My Songs**, the song-name box searches them, and you can delete one with ✕. Nothing is uploaded anywhere. Please use only files you have the right to use.

## Run
```
python3 -m http.server 8080   # then open http://localhost:8080
```

## Credits
Piano samples: **Salamander Grand Piano V3** by Alexander Holm, licensed [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/). These are the MP3 conversions from the Tone.js audio repository.

## License
MIT for the code (the samples are CC-BY 3.0, see Credits). The melodies are public-domain or traditional tunes, encoded by hand.
