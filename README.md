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
- Real grand piano sound from **Salamander Grand Piano** samples. 30 notes per velocity layer (every minor third, A0 to C8) in `samples/v4`, `v10`, `v16`, plus 88 key-release samples in `samples/rel`; notes in between are pitch-shifted from the nearest sample.
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


## Christmas & Playlist (v5)
- **🎄 Christmas** category with **31 full-length carols**, two hands: Jingle Bells (full), Silent Night, Deck the Halls, We Wish You a Merry Christmas, O Holy Night, Joy to the World, Carol of the Bells, O Come All Ye Faithful, Hark the Herald, The First Noel, O Christmas Tree, God Rest Ye Merry Gentlemen, Away in a Manger, Angels We Have Heard on High, We Three Kings, O Little Town of Bethlehem, It Came Upon the Midnight Clear, What Child Is This, Jolly Old St. Nicholas, Up on the Housetop, Ding Dong Merrily, Good King Wenceslas, Coventry Carol, The Holly and the Ivy, O Come O Come Emmanuel, Angels from the Realms of Glory, In the Bleak Midwinter, Once in Royal David's City, From Heaven Above, Lo How a Rose, and Tchaikovsky's March of the Wooden Soldiers.
- Sources: Mutopia (PD), Wikimedia Commons (CC0 / PD / CC BY 3.0 settings, mostly by Peter Gerloff "Rabanus Flavus"), PD 4-part ABC settings by Douglas D. Anderson, and an original arrangement of Leontovych's *Shchedryk* (Carol of the Bells). Full list in [songs/CREDITS.md](songs/CREDITS.md).
- **Christmas look** (⚙ → Look → Christmas 🎄): red and green bars, gold light, falling snow. It's suggested when a Christmas song starts.
- **🎶 Playlist** panel on the right (a slide-in drawer on phones; hidden in cinema mode). Tap **+** on any song to queue it, drag ⠿ to reorder, ✕ to remove. Use **▶ Play all** for Christmas, Classical, Ragtime, Traditional, Simple or My Songs. It auto-advances with a short gap. It also has ⏮ ⏭, 🔀 shuffle, 🔁/🔂 repeat (off / all / one) and highlights the song that's playing. **💾 Save** stores named playlists in your browser (IndexedDB). The current queue is remembered too.

## Song library (v4)
- **35 full-length pieces**, all public-domain compositions, grouped as **Classical**, **Ragtime** and **Traditional**. Includes Clair de Lune, Moonlight Sonata (1st mvt), Für Elise, Gymnopédie No. 1, Rondo alla Turca, Prelude in C, Nocturne Op. 9 No. 2, Minute Waltz, Arabesque No. 1, Träumerei, Maple Leaf Rag, The Entertainer, and carols. There are also short **Simple tunes**.
- The note data is converted from [Mutopia Project](https://www.mutopiaproject.org) MIDI files (public domain, CC BY or CC BY-SA). Canon in D is an original arrangement. Each song's source and license are listed in [songs/CREDITS.md](songs/CREDITS.md). Songs load on demand from `songs/*.json`.
- **🔎 Find**: type any title and press Find. You get links that search BitMidi, MuseScore, MidiWorld, FreeMIDI and Google for a free MIDI. Download the `.mid` and drag it onto the piano. It plays at full length and is saved to **My Songs** in your browser's IndexedDB, so long songs fit. Nothing is uploaded.
- A progress bar and time readout run along the top of the stage. Tap the bar to jump. Only the notes on screen are drawn, so 6-minute pieces with thousands of notes stay at 60 fps.

## Look & sound (v3)
- **Sakura glow** visuals (default) inspired by cinematic piano-visualizer videos: rounded glowing bars, two-pass bloom, star flares + rising glitter/smoke at the hit line, lit keys, ambient glow. Other looks: Neon, Gold, Ice, Christmas (⚙ menu).
- **Quality**: Auto / High / Low — Low halves particles and bloom for phones and saves battery.
- **Sound**: Salamander Grand with 3 velocity layers (soft / medium / loud, crossfaded), key-release samples, stereo spread by pitch, synthetic concert-hall reverb, damper behaviour, sustain pedal (button or hold Shift).
- **Humanize** (🎭): natural phrase dynamics, chord rolls and tiny timing variations for songs with flat velocities.
- **⛶ Cinema** mode hides the UI; 📚 hides the song list.

## Credits
Piano samples: **Salamander Grand Piano V3** by Alexander Holm, licensed [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/). MP3s from the npm `@audio-samples/piano-mp3-velocity*` and `piano-mp3-release` packages, re-encoded and trimmed.

## License
MIT for the code (the samples are CC-BY 3.0, see Credits). The melodies are public-domain or traditional tunes, encoded by hand.

## 📱 Phones & iPhone (v6)
- Responsive phone layout: compact top bar with a ⋯ overflow menu, library as a bottom sheet, playlist as a side drawer (both auto-close when a song starts so the keys stay visible), 44px tap targets, safe-area insets (notch/home bar), `100dvh`, no horizontal scroll.
- Portrait shows fewer octaves (songs still fit their range) and suggests rotating to landscape.
- No double-tap/pinch zoom, text selection or long-press callout on the piano.
- iOS audio unlock on first tap, `audioSession = playback` where supported, a one-time Silent-mode tip, and audio resumes after the app returns from the background.
- Lighter particles/bloom on phones; on cellular / Data Saver only the main sample layer loads (extra layers wait for Wi-Fi).
- Installable PWA (manifest, icons, Add to Home Screen tip on iOS Safari) with a service worker that caches the app, piano samples and songs for offline play.
