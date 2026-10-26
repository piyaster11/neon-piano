(() => {
const $ = id => document.getElementById(id);
const PA = window.PianoAudio;
const cv = $('cv'), ctx = cv.getContext('2d');
const glow = document.createElement('canvas'), gx = glow.getContext('2d');
const glow2 = document.createElement('canvas'), gx2 = glow2.getContext('2d');
const isBlack = m => [1,3,6,8,10].includes(m % 12);
const noteToMidi = s => { const r = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(s); if(!r) return null;
  let n = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[r[1].toUpperCase()] + (r[2]=='#'?1:r[2]=='b'?-1:0);
  return n + (parseInt(r[3])+1)*12; };
let LO = 21, HI = 108;

// ---------- themes & quality ----------
const THEMES = {
  sakura:{name:'Sakura glow', rh:[338,100,80], lh:[292,90,80], line:[340,100,90], amb:[335,90,55]},
  neon:  {name:'Neon',        rh:[186,100,62], lh:[312,100,64], line:[200,100,80], amb:[270,90,45]},
  gold:  {name:'Gold',        rh:[44,100,66],  lh:[22,100,62],  line:[42,100,85],  amb:[30,90,40]},
  ice:   {name:'Ice',         rh:[200,90,82],  lh:[230,85,78],  line:[200,100,92], amb:[215,80,45]},
};
const prefs = Object.assign({theme:'sakura', quality:'auto', humanize:true, reverb:true}, JSON.parse(localStorage.getItem('piyaster.prefs')||'{}'));
const savePrefs = () => localStorage.setItem('piyaster.prefs', JSON.stringify(prefs));
const T = () => THEMES[prefs.theme] || THEMES.sakura;
const css = (c, dl=0, a=1) => `hsla(${c[0]},${c[1]}%,${Math.max(0,Math.min(100,c[2]+dl))}%,${a})`;
const trackCol = i => i===0 ? T().rh : i===1 ? T().lh : [(T().rh[0]+i*47)%360, 90, 76];
const colOf = n => song.mode==='hands' ? (n.h ? T().lh : T().rh) : trackCol(n.h||0);
const autoLow = () => (Math.min(innerWidth,innerHeight) < 600 && (devicePixelRatio||1) >= 2) || (navigator.hardwareConcurrency||8) <= 4;
const HIQ = () => prefs.quality==='high' || (prefs.quality==='auto' && !autoLow());
PA.S.quality = HIQ() ? 'high' : 'low';

// ---------- audio wiring ----------
const status = $('loading');
PA.S.onStatus = (t, done, err) => { status.textContent = (err?'⚠️ ':'🎹 ')+t; if(done){ status.classList.add('ready'); if(!err) setTimeout(()=>status.classList.add('hide'),2500); } };
['pointerdown','touchend','keydown'].forEach(ev=>addEventListener(ev,()=>PA.unlock(),{capture:true,passive:true}));
$('vol').oninput = e => PA.setVolume(+e.target.value);
PA.setReverb(prefs.reverb);
function syncBtns(){ const sus=PA.S.sustain||PA.S.pedal; $('sus').classList.toggle('on',sus); $('sus').textContent=sus?'🦶 Sustain ON':'🦶 Sustain';
  $('rev').classList.toggle('on',PA.S.reverb); $('rev').textContent=PA.S.reverb?'🏛 Hall ON':'🏛 Hall';
  $('hum').classList.toggle('on',prefs.humanize); $('hum').textContent=prefs.humanize?'🎭 Humanize ON':'🎭 Humanize'; }
$('sus').onclick=()=>{ PA.setSustain(!PA.S.sustain); syncBtns(); };
$('rev').onclick=()=>{ prefs.reverb=!PA.S.reverb; PA.setReverb(prefs.reverb); savePrefs(); syncBtns(); };
$('hum').onclick=()=>{ prefs.humanize=!prefs.humanize; savePrefs(); syncBtns(); };
$('theme').value=prefs.theme; $('theme').onchange=e=>{ prefs.theme=e.target.value; savePrefs(); legend(); };
$('quality').value=prefs.quality; $('quality').onchange=e=>{ prefs.quality=e.target.value; savePrefs(); PA.S.quality=HIQ()?'high':'low'; layout(); };
$('cfg').onclick=()=>document.body.classList.toggle('show-settings');
$('libbtn').onclick=()=>document.body.classList.toggle('hide-lib');
$('fs').onclick=()=>{ const el=document.documentElement; if(!document.fullscreenElement){ (el.requestFullscreen||el.webkitRequestFullscreen||(()=>{})).call(el); document.body.classList.add('cinema'); } else { document.exitFullscreen&&document.exitFullscreen(); document.body.classList.remove('cinema'); } };
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement) document.body.classList.remove('cinema'); setTimeout(layout,50); });
addEventListener('keydown',e=>{ if(e.key==='Shift'&&!PA.S.pedal&&!(e.target.tagName==='INPUT'&&e.target.type==='text')){ PA.setPedal(true); syncBtns(); } });
addEventListener('keyup',e=>{ if(e.key==='Shift'&&PA.S.pedal){ PA.setPedal(false); syncBtns(); } });
syncBtns(); PA.load();

// ---------- layout ----------
let W=0,H=0,kbH=0,keys={},dpr=1,GS=4;
function layout(){ const hi=HIQ(); dpr = hi ? Math.min(2, devicePixelRatio||1) : 1; const r = cv.getBoundingClientRect();
  W = r.width; H = r.height; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
  GS = hi ? 4 : 6; glow.width=Math.ceil(W/GS); glow.height=Math.ceil(H/GS); glow2.width=Math.ceil(W/16); glow2.height=Math.ceil(H/16);
  if (W >= 1000) { LO=21; HI=108; } else if (W < 500) { LO=48; HI=84; } else { LO=36; HI=96; }
  if (song.notes.length){ let mn=1e9,mx=-1e9; for(const n of song.notes){ if(n.m<mn)mn=n.m; if(n.m>mx)mx=n.m; }
    while(mn<LO) LO-=12; while(mx>HI) HI+=12; LO=Math.max(21,LO); HI=Math.min(108,HI); }
  const whites=[]; for(let m=LO;m<=HI;m++) if(!isBlack(m)) whites.push(m);
  const ww = W/whites.length; keys = {};
  kbH = Math.round(Math.min(H*0.26, Math.max(70, ww*5.4)));
  whites.forEach((m,i)=> keys[m]={x:i*ww,w:ww,black:false});
  for(let m=LO;m<=HI;m++) if(isBlack(m) && keys[m-1]) { const off={1:0.6,3:0.72,6:0.58,8:0.66,10:0.74}[m%12]; keys[m]={x:keys[m-1].x+ww*off,w:ww*0.6,black:true}; }
  for (const m in keys) keys[m].cx = keys[m].x + keys[m].w/2;
}
addEventListener('resize', layout);

// ---------- state ----------
let song = {name:'',notes:[],mode:'hands'}, pos = 0, playing = false, tempo = 1, last = 0, aIdx = 0, vIdx = 0;
const muted={rh:false,lh:false}; const isMuted=n=> (n.h?muted.lh:muted.rh);
const held = {}; // manual: midi -> {t}
const flash = {}; // midi -> {t, col, v} attack flash
let parts = [];
const LOOK = () => 2.4; // seconds visible above keys
const LA = 0.15; // audio scheduling look-ahead (s)
function lowIdx(t){ const N=song.notes; let lo=0,hi=N.length; while(lo<hi){ const mid=(lo+hi)>>1; if(N[mid].t<t) lo=mid+1; else hi=mid; } return lo; }
function seek(p){ pos=p; aIdx=0; vIdx=0; const N=song.notes; while(aIdx<N.length&&N[aIdx].t<p-0.02) aIdx++; vIdx=aIdx; }
function rnd(i){ const x=Math.sin(i*12.9898+78.233)*43758.5453; return x-Math.floor(x); }
function humanizeNotes(N){ const vs=N.filter(n=>n.v!=null).map(n=>n.v); const varied = vs.length>N.length*0.8 && (Math.max(...vs)-Math.min(...vs))>0.12;
  const rhAvg = (()=>{ const a=N.filter(n=>!n.h); return a.length? a.reduce((s,n)=>s+n.m,0)/a.length : 64; })();
  let gi=0, gt=-1, inG=0;
  N.forEach((n,i)=>{ if (Math.abs(n.t-gt)>0.012){ gi++; gt=n.t; inG=0; } else inG++;
    const base = n.v!=null ? n.v : (n.h ? 0.46 : 0.66);
    if (varied){ n.hv = Math.max(0.05,Math.min(1, base + (rnd(i)-0.5)*0.05)); n.ht = 0; return; }
    const phrase = 0.09*Math.sin(n.t*2*Math.PI/10);
    const contour = n.h ? 0 : 0.07*(n.m-rhAvg)/12;
    n.hv = Math.max(0.12, Math.min(0.95, base + phrase + contour + (rnd(i)-0.5)*0.12));
    n.ht = (rnd(gi*7.1)-0.5)*0.016 + inG*0.006; }); }
function velOf(n){ return prefs.humanize ? (n.hv ?? n.v ?? 0.65) : (n.v ?? (n.h?0.5:0.7)); }
function fx(m, col, v){ const k=keys[m]; if(!k) return; flash[m]={t:performance.now(), col, v};
  const top=H-kbH, nS = HIQ()?14:5;
  for(let i=0;i<nS;i++) parts.push({x:k.cx+(Math.random()-.5)*k.w*0.6,y:top-1,vx:(Math.random()-.5)*2.6,vy:-(1.2+Math.random()*3.6)*(0.6+v),g:0.06,life:0.5+Math.random()*0.6,max:1,s:0.8+Math.random()*1.2,col,spark:1}); }
function play(m, dur, vel, col){ PA.noteOn(m, vel, 0, dur); fx(m, col||T().rh, vel); }

// ---------- parsing ----------
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
// My Songs live in IndexedDB (no 5 MB limit, full-length songs); localStorage is only a fallback
const DB=(()=>{ let dbp=null; const open=()=>dbp||(dbp=new Promise((res,rej)=>{ if(!window.indexedDB) return rej('no indexedDB'); const r=indexedDB.open('piyaster-piano',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('songs',{keyPath:'name'}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }));
  const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{ const t=db.transaction('songs',mode), q=fn(t.objectStore('songs')); t.oncomplete=()=>res(q&&q.result); t.onerror=t.onabort=()=>rej(t.error); }));
  return { all:()=>tx('readonly',s=>s.getAll()), put:o=>tx('readwrite',s=>s.put(o)), del:n=>tx('readwrite',s=>s.delete(n)) }; })();
let MINE=[], useLS=false;
const lsGet=()=>{ try{ return JSON.parse(localStorage.getItem(LS))||[]; }catch(e){ return []; } };
function getMine(){ return MINE; }
async function putMine(o){ o.at=Date.now(); MINE=[...MINE.filter(x=>x.name.toLowerCase()!==o.name.toLowerCase()),o];
  if(useLS){ localStorage.setItem(LS,JSON.stringify(MINE)); return; } await DB.put(o); }
async function delMine(name){ MINE=MINE.filter(x=>x.name!==name); if(useLS) localStorage.setItem(LS,JSON.stringify(MINE)); else await DB.del(name); }
async function initMine(){ try{ MINE=(await DB.all())||[]; const old=lsGet();
    for(const o of old) if(!MINE.some(x=>x.name===o.name)){ await DB.put(o); MINE.push(o); } if(old.length) localStorage.removeItem(LS); }
  catch(e){ useLS=true; MINE=lsGet(); }
  MINE.sort((a,b)=>(a.at||0)-(b.at||0)); renderLib(); window.__mineReady=MINE.length; }
// built-in full-length library (songs/index.json + one JSON per song, loaded on demand)
let CATALOG=[]; const songCache={};
const CATS=['Classical','Ragtime','Traditional'];
const fmtT=s=>{ s=Math.max(0,Math.round(s)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
async function loadCatalog(){ try{ CATALOG=await (await fetch('songs/index.json')).json(); }catch(e){ CATALOG=[]; } renderLib(); }
async function catNotes(c){ if(!songCache[c.id]){ const j=await (await fetch('songs/'+c.id+'.json')).json(); songCache[c.id]=j.notes; }
  return songCache[c.id].map(a=>({t:a[0],d:a[1],m:a[2],v:a[3],h:a[4],hue:a[4]?HUE_LH:HUE_RH})); }
function norm(s){ return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function lev(a,b){ const d=Array.from({length:a.length+1},(_,i)=>[i]); for(let j=1;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]==b[j-1]?0:1)); return d[a.length][b.length]; }
function findSong(q){ q = norm(q); if(!q) return null; let best=null, bs=0;
  for(const s of [...getMine().map(o=>({...o,alias:[],mine:true})),...CATALOG.map(c=>({...c,alias:[c.name.replace(/\(.*?\)/g,''),c.composer+' '+c.name],cat:c})),...SONGS]){ for(const cand of [s.name,...s.alias].map(norm)){
    if(cand.length<3) continue; let sc = (q.length>=3&&cand.includes(q))||(' '+q+' ').includes(' '+cand+' ') ? 1 : 0;
    if(!sc){ const STOP=new Set(['a','an','the','of','in','it','no','op','to','and','e','my','me','you','i','be','is','on','for','go','love']); const qw=q.split(' ').filter(w=>!STOP.has(w)), cw=cand.split(' ');
      const hits=qw.filter(w=>cw.some(c=>w===c||(w.length>=4&&c.length>=4&&lev(w,c)<=Math.floor(c.length/4)))).length; sc = qw.length? 0.9*hits/qw.length : 0; }
    if(!sc && q.length>=5) sc = 1 - lev(q,cand)/Math.max(q.length,cand.length);
    if(sc>bs){bs=sc;best=s;} } }
  return bs>=0.6?best:null; }
function load(name, notes, mode='hands'){ notes.sort((a,b)=>a.t-b.t); humanizeNotes(notes); song={name,notes,mode,maxD:notes.reduce((a,n)=>Math.max(a,n.d),0),end:notes.reduce((a,n)=>Math.max(a,n.t+n.d),0)}; legend(); seek(-1.2); layout(); }
function msg(t){ $('msg').innerHTML = t; }
async function fromInput(){ const q=$('song').value.trim(); if(!q){ msg('Type a song name or some notes first ✨'); return false; }
  let n = parseHands(q); if(n){ load('Your notes (RH+LH)',n,'hands'); msg('Playing your two-hand notes 🎹 Press 💾 Save to keep them.'); return true; }
  n = parseTokens(q,100); if(n){ n.forEach(x=>{x.h=0;x.hue=HUE_RH;}); load('Your notes',n); msg('Playing your notes 🎹 Press 💾 Save to keep them in My Songs.'); return true; }
  if(/[A-Ga-g]/.test(q) && (/^X:|\nK:|^[\^_=A-Ga-gzZ,'\d\/\s|]+$/.test(q)) && !/\s[a-z]{3,}/i.test(' '+q.replace(/^[A-Za-z]:.*$/gm,''))){
    n = parseABC(q); if(n){ load('ABC tune',n); msg('Playing ABC notation 🎼'); return true; } }
  const s = findSong(q);
  if(s && s.cat){ msg(`Loading <b>${s.name}</b>…`); try{ const n=await catNotes(s.cat); load(s.name,n,'hands'); msg(`Now playing: <b>${s.name}</b> · ${s.composer} · ${fmtT(s.dur)} <span class="dim">(${s.lic==='PD'?'public domain':s.lic==='MIT'?'original arrangement':s.lic+' — see credits'})</span>`); return true; }catch(e){ msg('Could not load that song: '+e); return false; } }
  if(s){ load(s.name, s.mine? s.notes.map(n=>({...n})) : builtIn(s), s.mine?(s.mode||'hands'):'hands'); msg(`Now playing: <b>${s.name.replace(/</g,'&lt;')}</b>${s.mine?' (My Songs)':''}`); return true; }
  msg(`I don't have “${esc(q)}” built in 🎵 ${findLinks(q)}`); return false; }
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FIND_SITES=[['BitMidi','https://bitmidi.com/search?q='],['MuseScore','https://musescore.com/sheetmusic?text='],['MidiWorld','https://www.midiworld.com/search/?q='],['FreeMIDI','https://freemidi.org/search?q='],['Google','https://www.google.com/search?q=',' piano midi download']];
function findLinks(q){ const e=encodeURIComponent;
  return `Find a free MIDI of it: ${FIND_SITES.map(([n,u,x])=>`<a class="find" target="_blank" rel="noopener" href="${u}${e(q+(x||''))}">🔎 ${n}</a>`).join(' ')}<br><span class="dim">Download the .mid file, then drag it onto the piano (or tap 🎵 MIDI). It plays at full length and is saved in 📚 My Songs on this device.</span>`; }
$('find').onclick=()=>{ const q=$('song').value.trim(); if(!q){ msg('Type a song title (any song — e.g. a movie or game theme) first, then press 🔎 Find.'); $('song').focus(); return; } msg(`Search for “${esc(q)}”: ${findLinks(q)}`); };

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
  importMidi(f.name,n); } catch(err){ msg('Could not read that MIDI file: '+err); } e.target.value=''; };

async function importMidi(fname,n){ const name=fname.replace(/\.midi?$/i,'').replace(/[_-]+/g,' ').trim(); load(name,n,n.mode||'tracks'); start();
  const dur=n.reduce((a,x)=>Math.max(a,x.t+x.d),0); await saveCurrent(name,true);
  msg(`Loaded <b>${esc(name)}</b> — ${n.length} notes, ${fmtT(dur)}, ${n.parts} part${n.parts>1?'s':''}. Saved to 📚 My Songs.`); }
function legend(){ const L=$('legend'); if(!L) return; L.innerHTML=''; if(!song.notes.length) return;
  if(song.mode==='hands'){ [['rh','Right hand'],['lh','Left hand']].forEach(([k,lab])=>{ if(!song.notes.some(n=>(n.h?'lh':'rh')===k)) return;
      const b=document.createElement('button'); b.className='hand'+(muted[k]?' off':''); b.style.setProperty('--c',css(k==='rh'?T().rh:T().lh,0));
      b.innerHTML=`<i></i>${lab} ${muted[k]?'🔇':'🔊'}`; b.title='Mute/unmute '+lab; b.onclick=()=>{muted[k]=!muted[k];legend();}; L.appendChild(b); }); }
  else { const ids=[...new Set(song.notes.map(n=>n.h))]; ids.slice(0,8).forEach(i=>{ const s=document.createElement('span'); s.className='hand'; s.style.setProperty('--c',css(trackCol(i),0)); s.innerHTML=`<i></i>Track ${i+1}`; L.appendChild(s); });
    [['rh','Track 1'],['lh','Other tracks']].forEach(([k,lab])=>{ const b=document.createElement('button'); b.className='hand'+(muted[k]?' off':''); b.textContent=(muted[k]?'🔇 ':'🔊 ')+lab; b.onclick=()=>{muted[k]=!muted[k];legend();}; L.appendChild(b); }); } }
const lib=$('lib');
function renderLib(){ lib.innerHTML=''; const mine=getMine();
  const head=t=>{ const h=document.createElement('b'); h.textContent=t; lib.appendChild(h); };
  const chip=(label,meta,fn,cls)=>{ const b=document.createElement('span'); if(cls) b.className=cls; b.textContent=label; if(meta){ const m=document.createElement('small'); m.textContent=meta; b.appendChild(m); } b.onclick=fn; lib.appendChild(b); return b; };
  const playName=n=>()=>{ $('song').value=n; $('play').click(); };
  head('📚 My Songs'+(mine.length?'':' — drop a .mid file here, or use 🔎 Find to get one'));
  mine.forEach(s=>{ const dur=s.notes.reduce((a,x)=>Math.max(a,x.t+x.d),0); const b=chip(s.name,fmtT(dur),playName(s.name),'mine');
    const x=document.createElement('i'); x.textContent='✕'; x.title='Delete';
    x.onclick=e=>{ e.stopPropagation(); if(confirm('Delete “'+s.name+'” from My Songs?')) delMine(s.name).then(renderLib); }; b.appendChild(x); });
  for(const c of CATS){ const L=CATALOG.filter(x=>x.cat===c); if(!L.length) continue; head(c);
    L.forEach(x=>chip(x.name,fmtT(x.dur),playName(x.name))); }
  head('Simple tunes'); SONGS.forEach(s=>chip(s.name,'',playName(s.name)));
  const cr=document.createElement('a'); cr.href='songs/CREDITS.md'; cr.target='_blank'; cr.className='credits'; cr.textContent='Song sources & licenses'; lib.appendChild(cr); }
async function saveCurrent(def,quiet){ if(!song.notes.length){ msg('Load a MIDI file or type notes first, then press 💾 Save.'); return; }
  const name=(quiet? (def||song.name) : (prompt('Name this song for My Songs:', def||song.name)||'')).trim(); if(!name) return;
  const notes=song.notes.map(n=>({m:n.m,t:+n.t.toFixed(3),d:+n.d.toFixed(3),...(n.v!=null?{v:+n.v.toFixed(2)}:{}),h:n.h||0,hue:n.hue??HUE_RH}));
  try{ await putMine({name,notes,mode:song.mode}); song.name=name; renderLib(); if(!quiet) msg(`Saved <b>${esc(name)}</b> to My Songs 💾`); }
  catch(e){ msg('Could not save (browser storage full?) '+e); } }
$('save').onclick=()=>saveCurrent();
renderLib(); initMine(); loadCatalog();
// drag & drop MIDI anywhere
addEventListener('dragover',e=>{e.preventDefault();document.body.classList.add('drag');});
addEventListener('dragleave',e=>{ if(!e.relatedTarget) document.body.classList.remove('drag'); });
addEventListener('drop',async e=>{ e.preventDefault(); document.body.classList.remove('drag'); const f=e.dataTransfer.files[0]; if(!f) return;
  try{ const n=parseMidi(await f.arrayBuffer()); if(!n.length) throw 'No notes found'; importMidi(f.name,n); }catch(err){ msg('Could not read that MIDI file: '+err); } });
// mouse/touch on keys (held until release, like a real key)
function keyAt(x,y){ if(y<H-kbH) return null; const yy=y-(H-kbH);
  if(yy<kbH*0.63) for(const m in keys){ const k=keys[m]; if(k.black&&x>=k.x&&x<=k.x+k.w) return +m; }
  for(const m in keys){ const k=keys[m]; if(!k.black&&x>=k.x&&x<k.x+k.w) return +m; } return null; }
const ptrs={};
function press(m,id){ ptrs[id]=m; held[m]={t:performance.now(),col:T().rh}; PA.noteOn(m,0.75); fx(m,T().rh,0.75); }
function lift(id){ const m=ptrs[id]; if(m==null) return; delete ptrs[id]; delete held[m]; PA.noteOff(m); }
cv.addEventListener('pointerdown',e=>{ const r=cv.getBoundingClientRect(); const m=keyAt(e.clientX-r.left,e.clientY-r.top); if(m!=null){ cv.setPointerCapture&&cv.setPointerCapture(e.pointerId); press(m,e.pointerId);} });
cv.addEventListener('pointermove',e=>{ if(!(e.pointerId in ptrs)) return; const r=cv.getBoundingClientRect(); const m=keyAt(e.clientX-r.left,e.clientY-r.top); if(m!=null&&m!==ptrs[e.pointerId]){ lift(e.pointerId); press(m,e.pointerId);} });
['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,e=>lift(e.pointerId)));
const KMAP='awsedftgyhujkolp;\''; let oct=60; const down={};
addEventListener('keydown',e=>{ if(e.target.tagName==='INPUT'&&e.target.type==='text') return; if(e.target.tagName==='SELECT') return; const k=e.key.toLowerCase();
  if(k==='z'){oct=Math.max(24,oct-12);msg('Keyboard octave: C'+(oct/12-1));return;} if(k==='x'){oct=Math.min(96,oct+12);msg('Keyboard octave: C'+(oct/12-1));return;}
  if(k===' '){e.preventDefault();$('pause').click();return;}
  const i=KMAP.indexOf(k); if(i<0||down[k]!=null) return; const m=oct+i; down[k]=m; held[m]={t:performance.now(),col:T().rh}; PA.noteOn(m,0.75); fx(m,T().rh,0.75); });
addEventListener('keyup',e=>{ const k=e.key.toLowerCase(); const m=down[k]; if(m==null) return; delete down[k]; delete held[m]; PA.noteOff(m); });

// ---------- controls ----------
function start(){ PA.unlock(); playing=true; last=performance.now(); $('pause').textContent='⏸'; if(innerWidth<900) document.body.classList.add('hide-lib'); }
$('play').onclick = async () => { PA.unlock(); if(await fromInput()) start(); };
$('song').onkeydown = e => { if(e.key==='Enter'){ e.preventDefault(); $('play').click(); } };
$('pause').onclick = () => { if(!song.notes.length) return; if(playing){ playing=false; $('pause').textContent='▶'; } else start(); };
$('stop').onclick = () => { PA.allOff(); playing=false; seek(-1.2); $('pause').textContent='⏸'; };
$('tempo').oninput = e => { tempo=+e.target.value; $('tv').textContent=tempo.toFixed(2).replace(/0$/,'')+'×'; };

// ---------- render ----------
function rr(c,x,y,w,h,r){ c.beginPath(); if(c.roundRect) c.roundRect(x,y,w,h,r); else c.rect(x,y,w,h); }
let dust=[]; // ambient motes
function frame(now){ const dt=Math.min(0.05,(now-last)/1000)||0.016; last=now; const hi=HIQ(); const th=T(); const f60=dt*60;
  const N=song.notes;
  if(playing){ pos+=dt*tempo;
    // audio: schedule slightly ahead on the audio clock for tight timing
    while(aIdx<N.length && N[aIdx].t+(prefs.humanize?(N[aIdx].ht||0):0) <= pos+LA*tempo){ const n=N[aIdx++]; if(isMuted(n)) continue;
      const ht=prefs.humanize?(n.ht||0):0; const when=PA.time+Math.max(0,(n.t+ht-pos)/tempo); PA.noteOn(n.m, velOf(n), when, n.d/tempo); }
    while(vIdx<N.length && N[vIdx].t<=pos){ const n=N[vIdx++]; if(!isMuted(n)) fx(n.m, colOf(n), velOf(n)); }
    if(vIdx>=N.length&&N.length&&pos>(song.end||0)+1.5){ window.__finished=(window.__finished||0)+1; window.__finishedAt=pos; playing=false; msg(`Finished <b>${song.name}</b> 🎉 Press Play to hear it again.`); seek(-1.2); } }
  const top=H-kbH, look=LOOK(), pps=top/look, tnow=performance.now();
  // active (sounding) notes -> lit keys
  const active={}; const i0=lowIdx(pos-(song.maxD||0)-0.1); window.__scan=0;
  for(let i=i0;i<N.length;i++){ const n=N[i]; window.__scan++; if(n.t>pos) break; if(n.t+n.d<pos||isMuted(n)) continue; const v=velOf(n); if(!active[n.m]||active[n.m].v<v) active[n.m]={col:colOf(n),v,age:pos-n.t}; }
  for(const m in held) active[m]={col:held[m].col,v:0.75,age:(tnow-held[m].t)/1000};
  let activity=0; for(const m in active) activity+=active[m].v; activity=Math.min(1,activity/3);
  // ---- background
  ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#030204'; ctx.fillRect(0,0,W,H);
  const amb=ctx.createRadialGradient(W/2,top,0,W/2,top,Math.max(W,H)*0.7); amb.addColorStop(0,css(th.amb,0,0.10+0.10*activity)); amb.addColorStop(0.5,css(th.amb,-20,0.035)); amb.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=amb; ctx.fillRect(0,0,W,top);
  // ambient dust motes
  const nd=hi?70:25; while(dust.length<nd) dust.push({x:Math.random()*W,y:Math.random()*top,vy:-(0.05+Math.random()*0.2),a:Math.random()*0.35,s:0.4+Math.random()*0.9,p:Math.random()*6});
  ctx.globalCompositeOperation='lighter';
  for(const d of dust){ d.y+=d.vy*f60; d.x+=Math.sin(tnow/2000+d.p)*0.08*f60; if(d.y<0){ d.y=top; d.x=Math.random()*W; }
    ctx.fillStyle=css(th.line,0,d.a*(0.5+0.5*Math.sin(tnow/700+d.p))); ctx.fillRect(d.x,d.y,d.s,d.s); }
  // glow buffer
  gx.setTransform(1,0,0,1,0,0); gx.globalCompositeOperation='source-over'; gx.clearRect(0,0,glow.width,glow.height); gx.setTransform(1/GS,0,0,1/GS,0,0); gx.globalCompositeOperation='lighter';
  // ---- falling note bars
  for(let i=i0;i<N.length;i++){ const n=N[i]; if(n.t>pos+look) break; if(n.t+n.d<pos-0.05) continue; const k=keys[n.m]; if(!k) continue;
    const yb=Math.min(top, top-(n.t-pos)*pps), yt=top-(n.t+n.d-pos)*pps; if(yb-yt<1) continue;
    const c=colOf(n), mu=isMuted(n), bw=k.black?k.w*0.86:k.w*0.62, x=k.cx-bw/2, r=Math.min(bw/2,3.5);
    const a=mu?0.18:1, sounding=n.t<=pos;
    const g=ctx.createLinearGradient(x,0,x+bw,0); g.addColorStop(0,css(c,-14,0.9*a)); g.addColorStop(0.5,css(c,sounding?8:3,a)); g.addColorStop(1,css(c,-14,0.9*a));
    ctx.fillStyle=g; rr(ctx,x,yt,bw,yb-yt,r); ctx.fill();
    if(!mu){ gx.fillStyle=css(c,-6,sounding?0.6:0.42); rr(gx,x-1,yt,bw+2,yb-yt,r); gx.fill(); } }
  // ---- flares & smoke at the hit line for sounding keys
  for(const m in active){ const k=keys[m]; if(!k) continue; const A=active[m], c=A.col, fl=0.85+0.15*Math.sin(tnow*0.035+ +m), atk=Math.max(0,1-A.age*3);
    const R=k.w*(1.1+1.0*atk)*(0.7+A.v*0.5);
    let rg=gx.createRadialGradient(k.cx,top,0,k.cx,top,R*1.6); rg.addColorStop(0,css(c,5,0.75*fl)); rg.addColorStop(1,css(c,0,0)); gx.fillStyle=rg; gx.fillRect(k.cx-R*1.6,top-R*1.6,R*3.2,R*3.2);
    // star flare (horizontal + vertical streaks) on main
    ctx.fillStyle=css(c,18,0.55*fl+0.3*atk); ctx.beginPath(); ctx.ellipse(k.cx,top-1,R*1.5,1.2+atk,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(k.cx,top-1,0.9+atk*0.6,R*0.9,0,0,7); ctx.fill();
    rg=ctx.createRadialGradient(k.cx,top-1,0,k.cx,top-1,R*0.5); rg.addColorStop(0,'rgba(255,255,255,'+(0.9*fl)+')'); rg.addColorStop(1,css(c,10,0)); ctx.fillStyle=rg; ctx.fillRect(k.cx-R*0.5,top-1-R*0.5,R,R);
    // rising smoke / glitter
    const rate=(hi?1.1:0.3)*(0.5+A.v)*f60; for(let i=0;i<rate+(Math.random()<rate%1?1:0)-1+1e-9&&i<6;i++)
      parts.push({x:k.cx+(Math.random()-.5)*k.w*1.2,y:top-2-Math.random()*6,vx:(Math.random()-.5)*0.4,vy:-(0.35+Math.random()*1.1),g:-0.004,life:1.6+Math.random()*1.8,max:0,s:0.5+Math.random()*1.3,col:c,ph:Math.random()*6}); }
  // ---- particles
  const cap=hi?1600:350; if(parts.length>cap) parts.splice(0,parts.length-cap);
  ctx.globalCompositeOperation='lighter';
  for(const p of parts){ p.vy+=p.g*f60; p.x+=(p.vx+(p.spark?0:Math.sin(tnow/600+p.ph)*0.25))*f60; p.y+=p.vy*f60; p.life-=dt; if(!p.max) p.max=p.life;
    const lf=Math.max(0,p.life/(p.max||1)), a=p.spark?lf:lf*(0.35+0.4*Math.sin(tnow/120+p.ph*5)**2);
    ctx.fillStyle=p.spark?`rgba(255,255,255,${a})`:css(p.col,12,a); ctx.fillRect(p.x,p.y,p.s,p.s);
    if(hi && (p.spark || p.ph<0.6)){ gx.fillStyle=css(p.col,10,a*0.8); gx.fillRect(p.x-p.s*2,p.y-p.s*2,p.s*5,p.s*5); } }
  parts=parts.filter(p=>p.life>0&&p.y>-10);
  // ---- hit line
  const lineA=0.65+0.35*activity;
  let lg=ctx.createLinearGradient(0,top-10,0,top+4); lg.addColorStop(0,css(th.line,0,0)); lg.addColorStop(0.7,css(th.line,0,0.35*lineA)); lg.addColorStop(1,css(th.line,8,0.9)); ctx.fillStyle=lg; ctx.fillRect(0,top-10,W,12);
  ctx.fillStyle=css(th.line,10,lineA); ctx.fillRect(0,top-1.5,W,2);
  gx.fillStyle=css(th.line,0,0.55*lineA); gx.fillRect(0,top-6,W,10);
  // ---- keyboard
  ctx.globalCompositeOperation='source-over';
  const fy=top+1; ctx.fillStyle='#1b0a10'; ctx.fillRect(0,top,W,kbH);
  for(const m in keys){ const k=keys[m]; if(k.black) continue; const A=active[m], on=!!A, y=fy+(on?1.5:0), h=kbH-2-(on?1.5:0);
    let g=ctx.createLinearGradient(0,y,0,y+h);
    if(on){ g.addColorStop(0,css(A.col,-14,1)); g.addColorStop(0.6,css(A.col,-4,1)); g.addColorStop(1,css(A.col,6,1)); }
    else { g.addColorStop(0,'#d9d4da'); g.addColorStop(0.08,'#f6f3f5'); g.addColorStop(0.9,'#ffffff'); g.addColorStop(0.94,'#e4dfe4'); g.addColorStop(1,'#bdb6bf'); }
    ctx.fillStyle=g; rr(ctx,k.x+0.6,y,k.w-1.2,h,[0,0,3,3]); ctx.fill(); }
  for(const m in keys){ const k=keys[m]; if(!k.black) continue; const A=active[m], on=!!A, h=kbH*0.63-(on?1:0), y=fy;
    let g=ctx.createLinearGradient(0,y,0,y+h);
    if(on){ g.addColorStop(0,css(A.col,-25,1)); g.addColorStop(1,css(A.col,-5,1)); } else { g.addColorStop(0,'#050405'); g.addColorStop(0.85,'#1d1b1f'); g.addColorStop(1,'#3a383d'); }
    ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(k.x+1.5,y,k.w,h+3);
    ctx.fillStyle=g; rr(ctx,k.x,y,k.w,h,[0,0,2,2]); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,'+(on?0.25:0.10)+')'; ctx.fillRect(k.x+k.w*0.18,y+2,k.w*0.14,h*0.8); }
  // light spill on key tops + labels
  let sp=ctx.createLinearGradient(0,top,0,top+kbH*0.22); sp.addColorStop(0,css(th.line,0,0.45)); sp.addColorStop(1,css(th.line,0,0)); ctx.fillStyle=sp; ctx.globalCompositeOperation='lighter'; ctx.fillRect(0,top,W,kbH*0.22); ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='#3a0d18'; ctx.fillRect(0,top,W,2);
  if(keys[60]&&keys[60].w>13){ ctx.fillStyle='rgba(90,80,95,.55)'; ctx.font=`${Math.min(10,keys[60].w*0.42)}px system-ui`; ctx.textAlign='center'; for(const m in keys) if(+m%12===0&&!active[m]) ctx.fillText('C'+(m/12-1),keys[m].cx,top+kbH-7); }
  // ---- bloom composite (two radii)
  ctx.globalCompositeOperation='lighter'; ctx.imageSmoothingEnabled=true;
  if(hi){ gx2.clearRect(0,0,glow2.width,glow2.height); gx2.drawImage(glow,0,0,glow2.width,glow2.height); ctx.globalAlpha=0.9; ctx.drawImage(glow2,0,0,W,H); }
  ctx.globalAlpha=hi?0.75:0.9; ctx.drawImage(glow,0,0,W,H); ctx.globalAlpha=1;
  ctx.globalCompositeOperation='source-over';
  // ---- text
  ctx.textAlign='left'; if(song.name){ ctx.fillStyle='rgba(255,230,240,.55)'; ctx.font='600 13px system-ui'; ctx.fillText('♪ '+song.name+'   '+fmtT(Math.max(0,pos))+' / '+fmtT(song.end||0)+(playing?'':'  (paused)'),10,20);
    const pr=Math.max(0,Math.min(1,pos/(song.end||1))); ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(0,0,W,3); ctx.fillStyle=css(th.line,0,0.85); ctx.fillRect(0,0,W*pr,3); }
  ctx.textAlign='right'; ctx.font='italic 700 15px "Segoe Script","Brush Script MT",cursive,system-ui'; ctx.fillStyle=css(th.line,0,0.5); ctx.fillText('Piyaster Piano',W-12,22);
  requestAnimationFrame(frame); }
layout(); requestAnimationFrame(t=>{last=t;frame(t);});
window.__piano={ get pos(){return pos;}, get playing(){return playing;}, get name(){return song.name;}, get end(){return song.end||0;}, get notes(){return song.notes.length;}, get tempo(){return tempo;}, set tempo(v){tempo=v;}, seek:p=>{PA.allOff(); seek(p);} };
// tap/drag the thin bar at the top of the stage to jump within the song
cv.addEventListener('pointerdown',e=>{ const r=cv.getBoundingClientRect(); if(e.clientY-r.top>18||!song.notes.length) return; e.stopImmediatePropagation(); PA.allOff(); seek(Math.max(0,(e.clientX-r.left)/r.width*(song.end||0))); },true);
// demo/autoplay via URL: ?song=fur+elise&seek=3
const qp=new URLSearchParams(location.search); if(qp.get('song')){ $('song').value=qp.get('song'); (async()=>{ if(!CATALOG.length) await loadCatalog(); if(await fromInput()){ seek(+(qp.get('seek')||0)); start(); } })(); }
if(qp.get('hidelib')) document.body.classList.add('hide-lib');
})();
