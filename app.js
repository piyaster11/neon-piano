(() => {
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const isBlack = m => [1,3,6,8,10].includes(m % 12);
const noteToMidi = s => { const r = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(s); if(!r) return null;
  let n = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[r[1].toUpperCase()] + (r[2]=='#'?1:r[2]=='b'?-1:0);
  return n + (parseInt(r[3])+1)*12; };
let LO = 36, HI = 96; // C2..C7 ; narrowed on phones
const hueFor = m => (m*37) % 360;

// ---------- audio ----------
let ac, master;
function audio(){ if(!ac){ ac = new (window.AudioContext||window.webkitAudioContext)();
  master = ac.createGain(); master.gain.value = +$('vol').value;
  const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);}
  if(ac.state==='suspended') ac.resume(); return ac; }
$('vol').oninput = e => { if(master) master.gain.value = +e.target.value; };
function tone(m, dur=0.5, vel=0.8){ audio(); const t = ac.currentTime, f = 440*Math.pow(2,(m-69)/12);
  const g = ac.createGain(); g.connect(master);
  const lp = ac.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = Math.min(9000, f*8); lp.connect(g);
  [['triangle',1,0.5],['sine',2,0.18],['sawtooth',1,0.05]].forEach(([type,mul,amp])=>{
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f*mul; const og = ac.createGain(); og.gain.value = amp;
    o.connect(og); og.connect(lp); o.start(t); o.stop(t+dur+1.6); });
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.35*vel,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.12*vel,t+0.25); g.gain.setValueAtTime(0.12*vel,t+Math.max(0.26,dur));
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur+1.5); }

// ---------- layout ----------
let W,H,kbH,keys=[],dpr=1;
function layout(){ dpr = Math.min(2, devicePixelRatio||1); const r = cv.getBoundingClientRect();
  W = r.width; H = r.height; cv.width = W*dpr; cv.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  if (W < 500) { LO=48; HI=84; } else if (W < 900) { LO=48; HI=96; } else { LO=36; HI=96; }
  // extend to fit current song
  if (song.notes.length){ const mn=Math.min(...song.notes.map(n=>n.m)), mx=Math.max(...song.notes.map(n=>n.m));
    while(mn<LO) LO-=12; while(mx>HI) HI+=12; LO=Math.max(21,LO); HI=Math.min(108,HI); }
  kbH = Math.min(H*0.28, Math.max(90, W*0.12));
  const whites=[]; for(let m=LO;m<=HI;m++) if(!isBlack(m)) whites.push(m);
  const ww = W/whites.length; keys = {};
  whites.forEach((m,i)=> keys[m]={x:i*ww,w:ww,black:false});
  for(let m=LO;m<=HI;m++) if(isBlack(m) && keys[m-1]) keys[m]={x:keys[m-1].x+ww*0.68,w:ww*0.64,black:true};
}
addEventListener('resize', layout);

// ---------- state ----------
let song = {name:'',notes:[]}, pos = 0, playing = false, tempo = 1, last = 0, nextIdx = 0;
const lit = {}; const muted={rh:false,lh:false}; const isMuted=n=> (n.h?muted.lh:muted.rh); // midi -> {until, hue}
let parts = [];
const LOOK = 2.6; // seconds visible above keys
function hit(m, dur, vel, hue){ hue=hue??hueFor(m); tone(m, dur, vel); lit[m] = {t: performance.now(), until: performance.now()+Math.max(260,dur*1000/tempo), hue};
  const k = keys[m]; if(!k) return; const y = H-kbH;
  for(let i=0;i<14;i++) parts.push({x:k.x+k.w/2,y,vx:(Math.random()-.5)*3,vy:-Math.random()*4-1,life:1,hue}); }

// ---------- parsing ----------
function parseTokens(str, bpm){ const spb = 60/bpm; let t=0, out=[];
  for (const tok of str.trim().split(/[\s,|]+/)){ if(!tok) continue; let [n,b] = tok.split(':'); b = b?parseFloat(b):1;
    const chord = n.split('+'); if(!/^r(est)?$/i.test(n)){ for(const c of chord){ const m = noteToMidi(c); if(m==null) return null; out.push({m,t,d:b*spb*0.95}); } }
    t += b*spb; } return out.length?out:null; }
const HUE_RH=185, HUE_LH=310, TRACK_HUES=[185,310,48,130,20,260,90,350,215,160];
function chordNotes(c){ const r=/^([A-G])([#b]?)(m7|maj7|m|7|dim)?$/.exec(c); if(!r) return null;
  let root={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[r[1]]+(r[2]=='#'?1:r[2]=='b'?-1:0); root=(root+12)%12;
  const q=r[3]||'', iv=q.startsWith('m')&&q!=='maj7'?[0,3,7]:q==='dim'?[0,3,6]:[0,4,7]; if(q.endsWith('7')) iv.push(q==='maj7'?11:10);
  const r2=36+root, r3=48+root; return {r2,r3,tri:iv.map(i=>r3+i)}; }
function genLH(spec,bpm){ const spb=60/bpm, out=[]; if(spec.lh) return (parseTokens(spec.lh,bpm)||[]).map(n=>({...n,h:1,hue:HUE_LH}));
  let t=spec.start||0; const B=spec.bar||4;
  for(const tok of spec.prog.trim().split(/\s+/)){ const [c,b]=tok.split(':'); const L=b?+b:B, ch=chordNotes(c); if(!ch){t+=L;continue;}
    const ev=[]; const add=(o,d,ns)=>{ if(o<L-1e-6) ns.forEach(m=>ev.push({m,o,d:Math.min(d,L-o)})); };
    const [a,b3,c5]=ch.tri;
    switch(spec.style){
      case 'alb': for(let o=0,i=0;o<L;o+=0.5,i++) add(o,0.5,[[a,c5,b3,c5][i%4]]); add(0,L,[ch.r2]); break;
      case 'arp': for(let o=0,i=0;o<L;o+=0.5,i++) add(o,0.5,[[ch.r2,ch.r2+7,a,b3,c5,b3][i%6]]); break;
      case 'waltz': for(let o=0;o<L;o+=3){ add(o,1,[ch.r2]); add(o+1,1,ch.tri); add(o+2,1,ch.tri);} break;
      case 'oompah': for(let o=0,i=0;o<L;o++,i++) add(o,1,i%2?ch.tri:[ch.r2]); break;
      case 'march': for(let o=0,i=0;o<L;o+=0.5,i++) add(o,0.5,[i%2?ch.r2+12:ch.r2]); break;
      case 'bass': add(0,L,[ch.r2,ch.r3]); break;
      default: add(0,L,[ch.r2,...ch.tri]); }
    ev.forEach(e=>out.push({m:e.m,t:(t+e.o)*spb,d:e.d*spb*0.92,h:1,hue:HUE_LH,v:0.55})); t+=L; }
  return out; }
function builtIn(s){ const rh=parseTokens(s.m,s.bpm).map(n=>({...n,h:0,hue:HUE_RH})); const sp=LH[s.name]; return sp?rh.concat(genLH(sp,s.bpm)):rh; }
function parseHands(q){ if(!/\b(RH|LH)\s*:/i.test(q)) return null; const out=[]; const parts=q.split(/\b(RH|LH)\s*:/i);
  for(let i=1;i<parts.length;i+=2){ const lh=parts[i].toUpperCase()==='LH'; const n=parseTokens(parts[i+1],100); if(!n) return null;
    n.forEach(x=>out.push({...x,h:lh?1:0,hue:lh?HUE_LH:HUE_RH})); } return out.length?out:null; }
function parseABC(str){ let L=0.5, bpm=120, key=''; const body=[];
  for(const line of str.split(/\n/)){ const h=/^([A-Za-z]):\s*(.*)$/.exec(line.trim());
    if(h){ if(h[1]=='L'){const [a,b]=h[2].split('/');L=(+a/+b)*4;} if(h[1]=='Q'){bpm=parseInt(h[2].split('=').pop())||bpm;} if(h[1]=='K') key=h[2]; }
    else body.push(line); }
  const re = /([\^_=]?)([A-Ga-gzZ])([,']*)(\d*)(\/?)(\d*)/g; let m, t=0, out=[], spb=60/bpm;
  const s = body.join(' '); while((m=re.exec(s))){ let len=L*(m[4]?+m[4]:1); if(m[5]) len/= m[6]?+m[6]:2;
    if(!/[zZ]/.test(m[2])){ let base={C:60,D:62,E:64,F:65,G:67,A:69,B:71}[m[2].toUpperCase()]; if(m[2]>='a') base+=12;
      for(const c of m[3]) base += c==','?-12:12; base += m[1]=='^'?1:m[1]=='_'?-1:0; out.push({m:base,t,d:len*spb*0.95}); }
    t += len*spb; }
  return out.length?out:null; }
const LS='neonPiano.mySongs';
function getMine(){ try{ return JSON.parse(localStorage.getItem(LS))||[]; }catch(e){ return []; } }
function setMine(a){ localStorage.setItem(LS,JSON.stringify(a)); }
function norm(s){ return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function lev(a,b){ const d=Array.from({length:a.length+1},(_,i)=>[i]); for(let j=1;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1)); return d[a.length][b.length]; }
function findSong(q){ q = norm(q); if(!q) return null; let best=null, bs=0;
  for(const s of [...getMine().map(o=>({...o,alias:[],mine:true})),...SONGS]){ for(const cand of [s.name,...s.alias].map(norm)){
    let sc = cand.includes(q)||q.includes(cand) ? 1 : 0;
    if(!sc){ const qw=q.split(' '), cw=cand.split(' '); const hits=qw.filter(w=>cw.some(c=>lev(w,c)<=Math.max(1,Math.floor(c.length/4)))).length; sc = 0.9*hits/Math.max(qw.length,1); }
    if(!sc) sc = 1 - lev(q,cand)/Math.max(q.length,cand.length);
    if(sc>bs){bs=sc;best=s;} } }
  return bs>=0.55?best:null; }
function load(name, notes, mode='hands'){ notes.sort((a,b)=>a.t-b.t); song={name,notes,mode}; legend(); pos=-1.2; nextIdx=0; layout(); }
function msg(t){ $('msg').innerHTML = t; }
function fromInput(){ const q=$('song').value.trim(); if(!q){ msg('Type a song name or some notes first ✨'); return false; }
  let n = parseHands(q); if(n){ load('Your notes (RH+LH)',n,'hands'); msg('Playing your two-hand notes 🎹 Press 💾 Save to keep them.'); return true; }
  n = parseTokens(q,100); if(n){ n.forEach(x=>{x.h=0;x.hue=HUE_RH;}); load('Your notes',n); msg('Playing your notes 🎹 Press 💾 Save to keep them in My Songs.'); return true; }
  if(/[A-Ga-g]/.test(q) && (/^X:|\nK:|^[\^_=A-Ga-gzZ,'\d\/\s|]+$/.test(q)) && !/\s[a-z]{3,}/i.test(' '+q.replace(/^[A-Za-z]:.*$/gm,''))){
    n = parseABC(q); if(n){ load('ABC tune',n); msg('Playing ABC notation 🎼'); return true; } }
  const s = findSong(q); if(s){ load(s.name, s.mine? s.notes.map(n=>({...n})) : builtIn(s), s.mine?(s.mode||'hands'):'hands'); msg(`Now playing: <b>${s.name.replace(/</g,'&lt;')}</b>${s.mine?' (My Songs)':''}`); return true; }
  msg(`Sorry, I don't have “${q.replace(/</g,'&lt;')}” yet 🎵 Try: ${SONGS.slice(0,6).map(s=>s.name).join(', ')}… or type notes like <code>C4 D4 E4:2</code>, or drop in your own MIDI file and 💾 Save it to My Songs.`); return false; }

// ---------- MIDI file ----------
function parseMidi(buf){ const d=new DataView(buf); let p=0; const str=n=>{let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(d.getUint8(p+i));p+=n;return s;};
  const u32=()=>{const v=d.getUint32(p);p+=4;return v;}, u16=()=>{const v=d.getUint16(p);p+=2;return v;};
  const vlq=()=>{let v=0,b;do{b=d.getUint8(p++);v=(v<<7)|(b&127);}while(b&128);return v;};
  if(str(4)!=='MThd') throw 'Not a MIDI file'; const hl=u32(); u16(); const nt=u16(), div=u16(); p=8+hl;
  const ev=[], tempos=[{tick:0,us:500000}];
  for(let k=0;k<nt;k++){ if(str(4)!=='MTrk') break; const len=u32(), end=p+len; let tick=0, rs=0; const open={}; const trk=k;
    while(p<end){ tick+=vlq(); let st=d.getUint8(p); if(st<0x80) st=rs; else p++; rs=st;
      if(st===0xFF){ const ty=d.getUint8(p++), l=vlq(); if(ty===0x51) tempos.push({tick,us:(d.getUint8(p)<<16)|(d.getUint8(p+1)<<8)|d.getUint8(p+2)}); p+=l; }
      else if(st===0xF0||st===0xF7){ p+=vlq(); }
      else { const t=st&0xF0, ch=st&15, a=d.getUint8(p++), b=(t===0xC0||t===0xD0)?0:d.getUint8(p++);
        if(ch===9) continue;
        if(t===0x90&&b>0){ (open[a]=open[a]||[]).push({tick,v:b}); }
        else if(t===0x80||(t===0x90&&b===0)){ const o=(open[a]||[]).shift(); if(o) ev.push({m:a,s:o.tick,e:tick,v:o.v/127,trk,ch}); } } }
    p=end; }
  tempos.sort((a,b)=>a.tick-b.tick); const sec=tk=>{let s=0,prev=0,us=500000; for(const t of tempos){ if(t.tick>=tk) break; s+=(t.tick-prev)*us/div/1e6; prev=t.tick; us=t.us; } return s+(tk-prev)*us/div/1e6; };
  const multi=new Set(ev.map(e=>e.trk)).size>1, key=e=>multi?e.trk:e.ch; const ids=[...new Set(ev.map(key))].sort((a,b)=>a-b);
  const notes=ev.map(e=>({m:e.m,t:sec(e.s),d:Math.max(0.08,sec(e.e)-sec(e.s)),v:e.v,h:ids.indexOf(key(e))}));
  // if exactly 2 parts, call higher one RH; otherwise color per track
  if(ids.length===2){ const avg=i=>{const a=notes.filter(n=>n.h===i);return a.reduce((s,n)=>s+n.m,0)/a.length;}; const hi=avg(0)>=avg(1)?0:1; notes.forEach(n=>{n.h=n.h===hi?0:1;n.hue=n.h?HUE_LH:HUE_RH;}); notes.mode='hands'; }
  else notes.forEach(n=>n.hue=ids.length===1?HUE_RH:TRACK_HUES[n.h%TRACK_HUES.length]);
  notes.parts=ids.length; return notes; }
$('file').onchange = async e => { const f=e.target.files[0]; if(!f) return; try{ const n=parseMidi(await f.arrayBuffer()); if(!n.length) throw 'No notes found';
  load(f.name,n,n.mode||'tracks'); msg(`Loaded MIDI: <b>${f.name}</b> (${n.length} notes, ${n.parts} part${n.parts>1?'s':''})`); start(); saveCurrent(f.name.replace(/\.midi?$/i,'')); } catch(err){ msg('Could not read that MIDI file: '+err); } e.target.value=''; };

// ---------- controls ----------
function start(){ audio(); playing=true; last=performance.now(); $('pause').textContent='⏸'; }
$('play').onclick = () => { if(fromInput()) start(); };
$('song').onkeydown = e => { if(e.key==='Enter'){ e.preventDefault(); $('play').click(); } };
$('pause').onclick = () => { if(!song.notes.length) return; if(playing){playing=false;$('pause').textContent='▶';} else start(); };
$('stop').onclick = () => { playing=false; pos=-1.2; nextIdx=0; $('pause').textContent='⏸'; };
$('tempo').oninput = e => { tempo=+e.target.value; $('tv').textContent=tempo.toFixed(2).replace(/0$/,'')+'×'; };
function legend(){ const L=$('legend'); if(!L) return; L.innerHTML=''; if(!song.notes.length) return;
  if(song.mode==='hands'){ [['rh','Right hand',HUE_RH],['lh','Left hand',HUE_LH]].forEach(([k,lab,h])=>{ if(!song.notes.some(n=>(n.h?'lh':'rh')===k)) return;
      const b=document.createElement('button'); b.className='hand'+(muted[k]?' off':''); b.style.setProperty('--c',`hsl(${h},100%,60%)`);
      b.innerHTML=`<i></i>${lab} ${muted[k]?'🔇':'🔊'}`; b.title='Mute/unmute '+lab; b.onclick=()=>{muted[k]=!muted[k];legend();}; L.appendChild(b); }); }
  else { const ids=[...new Set(song.notes.map(n=>n.h))]; ids.slice(0,8).forEach(i=>{ const s=document.createElement('span'); s.className='hand'; s.style.setProperty('--c',`hsl(${TRACK_HUES[i%TRACK_HUES.length]},100%,60%)`); s.innerHTML=`<i></i>Track ${i+1}`; L.appendChild(s); });
    [['rh','Track 1'],['lh','Other tracks']].forEach(([k,lab])=>{ const b=document.createElement('button'); b.className='hand'+(muted[k]?' off':''); b.textContent=(muted[k]?'🔇 ':'🔊 ')+lab; b.onclick=()=>{muted[k]=!muted[k];legend();}; L.appendChild(b); }); } }
const lib=$('lib');
function renderLib(){ lib.innerHTML=''; const mine=getMine();
  if(mine.length){ const h=document.createElement('b'); h.textContent='My Songs'; lib.appendChild(h);
    mine.forEach(s=>{ const b=document.createElement('span'); b.className='mine'; b.textContent=s.name; const x=document.createElement('i'); x.textContent='✕'; x.title='Delete';
      x.onclick=e=>{ e.stopPropagation(); if(confirm('Delete “'+s.name+'” from My Songs?')){ setMine(getMine().filter(o=>o.name!==s.name)); renderLib(); } };
      b.appendChild(x); b.onclick=()=>{ $('song').value=s.name; $('play').click(); }; lib.appendChild(b); });
    const h2=document.createElement('b'); h2.textContent='Built-in (public domain)'; lib.appendChild(h2); }
  SONGS.forEach(s=>{ const b=document.createElement('span'); b.textContent=s.name; b.onclick=()=>{ $('song').value=s.name; $('play').click(); }; lib.appendChild(b); }); }
function saveCurrent(def){ if(!song.notes.length){ msg('Load a MIDI file or type notes first, then press 💾 Save.'); return; }
  const name=(prompt('Name this song for My Songs:', def||song.name)||'').trim(); if(!name) return;
  const notes=song.notes.map(n=>({m:n.m,t:+n.t.toFixed(3),d:+n.d.toFixed(3),...(n.v!=null?{v:+n.v.toFixed(2)}:{}),h:n.h||0,hue:n.hue??HUE_RH}));
  try{ setMine([...getMine().filter(o=>o.name.toLowerCase()!==name.toLowerCase()),{name,notes,mode:song.mode}]); song.name=name; renderLib(); msg(`Saved <b>${name.replace(/</g,'&lt;')}</b> to My Songs 💾`); }
  catch(e){ msg('Could not save (browser storage full?)'); } }
$('save').onclick=()=>saveCurrent();
renderLib();
// drag & drop MIDI anywhere
addEventListener('dragover',e=>{e.preventDefault();document.body.classList.add('drag');});
addEventListener('dragleave',e=>{ if(!e.relatedTarget) document.body.classList.remove('drag'); });
addEventListener('drop',async e=>{ e.preventDefault(); document.body.classList.remove('drag'); const f=e.dataTransfer.files[0]; if(!f) return;
  try{ const n=parseMidi(await f.arrayBuffer()); if(!n.length) throw 'No notes found'; load(f.name.replace(/\.midi?$/i,''),n,n.mode||'tracks'); start(); saveCurrent(); }catch(err){ msg('Could not read that MIDI file: '+err); } });

// mouse/touch on keys
function keyAt(x,y){ if(y<H-kbH) return null; const yy=y-(H-kbH);
  if(yy<kbH*0.62) for(const m in keys){ const k=keys[m]; if(k.black&&x>=k.x&&x<=k.x+k.w) return +m; }
  for(const m in keys){ const k=keys[m]; if(!k.black&&x>=k.x&&x<k.x+k.w) return +m; } return null; }
const ptrs={};
cv.addEventListener('pointerdown',e=>{ const r=cv.getBoundingClientRect(); const m=keyAt(e.clientX-r.left,e.clientY-r.top); if(m!=null){ptrs[e.pointerId]=m; hit(m,0.6,0.9);} });
cv.addEventListener('pointermove',e=>{ if(!(e.pointerId in ptrs)) return; const r=cv.getBoundingClientRect(); const m=keyAt(e.clientX-r.left,e.clientY-r.top); if(m!=null&&m!==ptrs[e.pointerId]){ptrs[e.pointerId]=m; hit(m,0.6,0.9);} });
['pointerup','pointercancel','pointerleave'].forEach(t=>cv.addEventListener(t,e=>delete ptrs[e.pointerId]));
// computer keyboard: A W S E D F T G Y H U J K O L P ; ' (C4..)  Z/X octave shift
const KMAP='awsedftgyhujkolp;\''; let oct=60; const down={};
addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT'&&e.target.type==='text') return; const k=e.key.toLowerCase();
  if(k==='z'){oct=Math.max(24,oct-12);msg('Keyboard octave: C'+(oct/12-1));return;} if(k==='x'){oct=Math.min(96,oct+12);msg('Keyboard octave: C'+(oct/12-1));return;}
  if(k===' '){e.preventDefault();$('pause').click();return;}
  const i=KMAP.indexOf(k); if(i<0||down[k]) return; down[k]=1; hit(oct+i,0.6,0.9); });
addEventListener('keyup',e=>delete down[e.key.toLowerCase()]);

// ---------- render ----------
function rr(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h); }
function frame(now){ const dt=Math.min(0.1,(now-last)/1000); last=now;
  if(playing){ pos+=dt*tempo; const N=song.notes;
    while(nextIdx<N.length&&N[nextIdx].t<=pos){ const n=N[nextIdx++]; if(!isMuted(n)) hit(n.m,n.d,n.v??0.8,n.hue); }
    if(nextIdx>=N.length&&N.length&&pos>N[N.length-1].t+N[N.length-1].d+1){ playing=false; msg(`Finished <b>${song.name}</b> 🎉 Press Play to hear it again.`); pos=-1.2; nextIdx=0; } }
  const top=H-kbH;
  // background
  const bg=ctx.createLinearGradient(0,0,0,top); bg.addColorStop(0,'#05030c'); bg.addColorStop(1,'#120a2e'); ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  // lanes
  ctx.lineWidth=1; for(const m in keys){ const k=keys[m]; if(!k.black&&(+m%12===0||+m%12===5)){ ctx.strokeStyle=+m%12===0?'rgba(120,90,255,.18)':'rgba(120,90,255,.07)'; ctx.beginPath(); ctx.moveTo(k.x,0); ctx.lineTo(k.x,top); ctx.stroke(); } }
  // falling notes
  const pps=top/LOOK; ctx.save(); ctx.globalCompositeOperation='lighter';
  for(const n of song.notes){ if(n.t>pos+LOOK) break; if(n.t+n.d<pos-0.5) continue; const k=keys[n.m]; if(!k) continue;
    const yb=top-(n.t-pos)*pps, yt=yb-n.d*pps, h=n.hue??hueFor(n.m), x=k.x+1.5, w=k.w-3; ctx.globalAlpha=isMuted(n)?0.15:1;
    ctx.shadowColor=`hsl(${h},100%,60%)`; ctx.shadowBlur=22;
    const g=ctx.createLinearGradient(0,yt,0,yb); g.addColorStop(0,`hsla(${h},100%,55%,.55)`); g.addColorStop(1,`hsla(${h},100%,70%,.95)`);
    ctx.fillStyle=g; rr(x,Math.max(-10,yt),w,Math.min(yb,top)-Math.max(-10,yt),Math.min(6,w/2)); ctx.fill();
    ctx.shadowBlur=0; ctx.strokeStyle=`hsla(${h},100%,85%,.9)`; ctx.lineWidth=1.2; ctx.stroke(); }
  ctx.globalAlpha=1; ctx.restore();
  // hit line glow
  const hl=ctx.createLinearGradient(0,top-14,0,top); hl.addColorStop(0,'rgba(196,0,255,0)'); hl.addColorStop(1,'rgba(0,229,255,.55)'); ctx.fillStyle=hl; ctx.fillRect(0,top-14,W,14);
  // keyboard
  const tnow=performance.now();
  const drawKey=(m,k)=>{ const L=lit[m], on=L&&L.until>tnow, y=top+(on?2:0), h=k.black?kbH*0.62:kbH;
    if(k.black){ const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,'#2a2440'); g.addColorStop(1,'#0b0912'); ctx.fillStyle=on?`hsl(${L.hue},100%,55%)`:g; }
    else { const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,'#e9e7f5'); g.addColorStop(1,'#ffffff'); ctx.fillStyle=on?`hsl(${L.hue},100%,68%)`:g; }
    if(on){ctx.shadowColor=`hsl(${L.hue},100%,60%)`;ctx.shadowBlur=30;}
    rr(k.x+0.5,y,k.w-1,h-(k.black?0:2),[0,0,4,4]); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle=k.black?'#000':'#9a93b8'; ctx.lineWidth=1; ctx.stroke();
    if(!k.black&&m%12===0&&k.w>14){ ctx.fillStyle=on?'#000':'#7a72a0'; ctx.font=`${Math.min(11,k.w*0.5)}px system-ui`; ctx.textAlign='center'; ctx.fillText('C'+(m/12-1),k.x+k.w/2,top+kbH-8); } };
  for(const m in keys) if(!keys[m].black) drawKey(+m,keys[m]);
  for(const m in keys) if(keys[m].black) drawKey(+m,keys[m]);
  // glow above lit keys
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(const m in lit){ const L=lit[m], k=keys[m]; if(!k||L.until<tnow) continue; const g=ctx.createRadialGradient(k.x+k.w/2,top,0,k.x+k.w/2,top,k.w*3);
    g.addColorStop(0,`hsla(${L.hue},100%,70%,.8)`); g.addColorStop(1,`hsla(${L.hue},100%,50%,0)`); ctx.fillStyle=g; ctx.fillRect(k.x-k.w*3,top-k.w*3,k.w*7,k.w*3.2); }
  // particles
  parts=parts.filter(p=>p.life>0); for(const p of parts){ p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.life-=0.025;
    ctx.fillStyle=`hsla(${p.hue},100%,${60+p.life*30}%,${p.life})`; ctx.beginPath(); ctx.arc(p.x,p.y,1.2+p.life*2.2,0,7); ctx.fill(); }
  ctx.restore();
  // title overlay
  if(song.name){ ctx.fillStyle='rgba(232,230,255,.55)'; ctx.font='600 13px system-ui'; ctx.textAlign='left'; ctx.fillText('♪ '+song.name+(playing?'':'  (paused)'),10,20); }
  requestAnimationFrame(frame); }
layout(); requestAnimationFrame(t=>{last=t;frame(t);});

// demo/autoplay via URL: ?song=fur+elise&seek=3
const qp=new URLSearchParams(location.search); if(qp.get('song')){ $('song').value=qp.get('song'); if(fromInput()){ pos=+(qp.get('seek')||0); while(nextIdx<song.notes.length&&song.notes[nextIdx].t<pos-0.25) nextIdx++; start(); } }
})();
