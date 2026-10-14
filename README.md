# ✦ Neon Piano

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

## My Songs (your own music)
The app ships only public-domain or traditional melodies. For anything else, such as songs by the Beatles or music from Final Fantasy or Studio Ghibli, **you supply your own files**:
- Drag a `.mid` file onto the page or use **🎵 MIDI**. The app plays it and asks you for a name.
- Or paste notes or ABC into the box, press Play, then press **💾 Save**.
Saved songs are kept in your browser's `localStorage` (key `neonPiano.mySongs`). They show up under **My Songs**, the song-name box searches them, and you can delete one with ✕. Nothing is uploaded anywhere. Please use only files you have the right to use.

## Run
```
python3 -m http.server 8080   # then open http://localhost:8080
```

## License
MIT. The melodies are public-domain or traditional tunes, encoded by hand.
