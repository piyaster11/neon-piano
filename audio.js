// Piyaster Piano audio engine — Salamander Grand Piano V3 (Alexander Holm, CC-BY 3.0)
// 3 velocity layers (v4 pp, v10 mf, v16 ff) crossfaded, key-release samples, stereo by pitch,
// pitch-dependent damper release, sustain pedal, synthetic concert-hall IR. Falls back to a synth.
window.PianoAudio = (() => {
  const LAYERS = [{id:4,c:0.28},{id:10,c:0.62},{id:16,c:1.0}];
  const ANCH = []; for (let o=0;o<=7;o++) for (const [n,pc] of [['C',0],['Ds',3],['Fs',6],['A',9]]) { const m=(o+1)*12+pc; if(m>=21) ANCH.push([n+o,m]); } ANCH.push(['C8',108]);
  let ac, master, bus, wet, conv, comp, buf = {4:{},10:{},16:{}}, rel = {}, ready = false, failed = false;
  const S = { reverb:true, sustain:false, pedal:false, quality:'high', volume:0.7, onStatus:()=>{} };
  const voices = {}; // midi -> [voice]
  function ctx(){ if (ac) return ac;
    // iOS 17+: play through the silent switch like a music app
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch(e){}
    const AC = window.AudioContext||window.webkitAudioContext; try { ac = new AC({latencyHint:'interactive'}); } catch(e){ ac = new AC(); }
    ac.onstatechange = () => { window.__acState = ac.state; };
    master = ac.createGain(); master.gain.value = S.volume;
    bus = ac.createGain();
    comp = ac.createDynamicsCompressor(); comp.threshold.value=-12; comp.knee.value=12; comp.ratio.value=2.5; comp.attack.value=0.004; comp.release.value=0.25;
    const hp = ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=180;
    conv = ac.createConvolver(); conv.buffer = hallIR(); wet = ac.createGain(); wet.gain.value = S.reverb?0.3:0;
    bus.connect(master); bus.connect(hp); hp.connect(conv); conv.connect(wet); wet.connect(master); master.connect(comp); comp.connect(ac.destination);
    return ac; }
  // Concert hall IR: pre-delay, early reflections, decorrelated stereo tail with frequency-dependent damping
  function hallIR(){ const sr=ac.sampleRate, T=3.4, len=Math.floor(sr*T), b=ac.createBuffer(2,len,sr), pre=Math.floor(sr*0.018);
    for (let c=0;c<2;c++){ const d=b.getChannelData(c); let lp=0;
      const er=[[0.007,0.55],[0.013,0.42],[0.019,0.35],[0.027,0.3],[0.034,0.26],[0.043,0.22],[0.051,0.18],[0.062,0.15],[0.071,0.12],[0.083,0.1]];
      er.forEach(([t,a],i)=>{ const k=pre+Math.floor(sr*(t*(c?1.07:0.95))); if(k<len) d[k]+=(i%2?-a:a)*0.8; });
      for (let i=pre;i<len;i++){ const t=(i-pre)/sr; const env=Math.exp(-t*2.1)*(t<0.06?t/0.06:1);
        const cut=0.55*Math.exp(-t*0.9)+0.04; lp += cut*((Math.random()*2-1)-lp); d[i]+=lp*env*0.9; } }
    return b; }
  // iOS needs resume() + a (silent) buffer started inside a user gesture; also after an interruption/backgrounding
  let unlocked=false;
  function unlock(){ ctx(); if (ac.state!=='running'){ try{ ac.resume(); }catch(e){} }
    if (!unlocked || ac.state!=='running'){ try{ const s=ac.createBufferSource(); s.buffer=ac.createBuffer(1,1,22050); s.connect(ac.destination); s.start(0); }catch(e){} unlocked = ac.state==='running' || unlocked; } }
  function resume(){ if(!ac) return Promise.resolve(); if(ac.state==='running') return Promise.resolve(); try{ const p=ac.resume(); return p&&p.catch?p.catch(()=>{}):Promise.resolve(); }catch(e){ return Promise.resolve(); } }
  async function fetchBuf(url){ const r=await fetch(url); if(!r.ok) throw url+' '+r.status; const ab=await r.arrayBuffer(); return await new Promise((res,rej)=>ctx().decodeAudioData(ab,res,rej)); }
  async function load(){ ctx(); let done=0; const total=ANCH.length;
    S.onStatus(`Loading grand piano… 0/${total}`);
    try { await Promise.all(ANCH.map(async([n,m])=>{ buf[10][m]=await fetchBuf(`samples/v10/${n}.mp3`); done++; S.onStatus(`Loading grand piano… ${done}/${total}`); }));
      ready=true; S.onStatus('Grand piano ready', true); window.__samplesLoaded=true;
    } catch(e){ failed=true; window.__sampleError=String(e); S.onStatus('Piano samples failed to load — using synth', true, true); return; }
    // medium layer is enough to play. Soft/loud layers + key-release samples come later:
    // right away on Wi-Fi/desktop, after a pause on phones, and only on Wi-Fi when the connection is metered (cellular / data saver).
    const c=navigator.connection, metered=()=>!!(c&&(c.saveData||c.type==='cellular'||/(^|-)(2g|3g)$/.test(c.effectiveType||'')));
    window.__metered=metered();
    if (metered()){ S.onStatus('Grand piano ready · data saver: extra layers load on Wi-Fi', true);
      if (c && c.addEventListener) c.addEventListener('change', function f(){ if(!metered()){ c.removeEventListener('change',f); extras(); } }); return; }
    if (S.quality==='low') await new Promise(r=>setTimeout(r,6000));
    return extras(); }
  let extrasStarted=false;
  async function extras(){ if(extrasStarted) return; extrasStarted=true;
    const jobs=[]; for (const v of [16,4]) for (const [n,m] of ANCH) jobs.push(()=>fetchBuf(`samples/v${v}/${n}.mp3`).then(b=>buf[v][m]=b).catch(()=>{}));
    for (let i=1;i<=88;i++) jobs.push(()=>fetchBuf(`samples/rel/rel${i}.mp3`).then(b=>rel[20+i]=b).catch(()=>{}));
    let k=0; const worker=async()=>{ while(k<jobs.length) await jobs[k++](); };
    await Promise.all([worker(),worker(),worker(),worker()]); window.__layersLoaded=Object.keys(buf[16]).length+Object.keys(buf[4]).length; window.__relLoaded=Object.keys(rel).length; }
  function nearest(layer,m){ let best=null,bd=1e9; for(const k in buf[layer]){ const d=Math.abs(k-m); if(d<bd){bd=d;best=+k;} } return best; }
  const panFor = m => Math.max(-1,Math.min(1,(m-64)/44))*0.6;
  const dampTau = m => m>=90 ? 1.6 : 0.045 + 0.2*Math.pow((108-m)/87,1.5); // top keys have no dampers
  function strike(m, vel){ const av=LAYERS.filter(L=>Object.keys(buf[L.id]).length>0 && (S.quality!=='low'||L.id===10));
    if (av.length===1 || vel<=av[0].c) return [{id:av[0].id,w:1}]; const last=av[av.length-1]; if (vel>=last.c) return [{id:last.id,w:1}];
    for (let i=0;i<av.length-1;i++) if (vel>=av[i].c && vel<=av[i+1].c){ const f=(vel-av[i].c)/(av[i+1].c-av[i].c); return [{id:av[i].id,w:Math.cos(f*Math.PI/2)},{id:av[i+1].id,w:Math.sin(f*Math.PI/2)}]; }
    return [{id:last.id,w:1}]; }
  function noteOn(m, vel=0.7, when=0, dur=null){ ctx(); const now=ac.currentTime; const t=Math.max(now,when||now); vel=Math.max(0.04,Math.min(1,vel));
    // repeated key: damp previous strike
    (voices[m]||[]).forEach(v=>release(v,t+0.005,true)); voices[m]=[];
    let v;
    if (!ready) v = synthVoice(m,vel,t);
    else { const g=ac.createGain(); const pan=ac.createStereoPanner?ac.createStereoPanner():null; const lp=ac.createBiquadFilter(); lp.type='lowpass';
      lp.frequency.value = 2500 + vel*vel*15000; lp.Q.value=0.3;
      const level = 0.55*Math.pow(vel,0.55); g.gain.setValueAtTime(level,t);
      const srcs=[];
      for (const {id,w} of strike(m,vel)){ const a=nearest(id,m); if(a==null) continue; const s=ac.createBufferSource(); s.buffer=buf[id][a];
        s.playbackRate.value=Math.pow(2,(m-a)/12); const sg=ac.createGain(); sg.gain.value=w*(id===4?1.25:id===16?0.85:1);
        s.connect(sg); sg.connect(lp); s.start(t); srcs.push(s); }
      lp.connect(g); if(pan){ pan.pan.value=panFor(m); g.connect(pan); pan.connect(bus); } else g.connect(bus);
      v={m,g,srcs,level,vel,t0:t}; srcs[0]&&(srcs[0].onended=()=>{v.done=true;}); }
    voices[m]=[v];
    if (dur!=null) { const offAt=t+Math.max(0.06,dur); const ms=(offAt-ac.currentTime)*1000; setTimeout(()=>noteOff(m,v),Math.max(0,ms)); }
    return v; }
  function noteOff(m, only){ const list=voices[m]||[]; for(const v of list){ if(only&&v!==only) continue; if(S.sustain||S.pedal) v.sustained=true; else release(v,ac.currentTime); } }
  function release(v,t,quiet){ if(!v||v.done) return; v.done=true; t=Math.max(t,ac.currentTime); const tau=quiet?0.03:dampTau(v.m);
    v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value,t); v.g.gain.setTargetAtTime(0,t,tau);
    (v.srcs||[]).forEach(s=>{ try{s.stop(t+tau*6+0.05);}catch(e){} }); (v.osc||[]).forEach(o=>{ try{o.stop(t+tau*6+0.05);}catch(e){} });
    if (!quiet && rel[v.m] && v.m<90 && S.quality!=='low'){ const s=ac.createBufferSource(); s.buffer=rel[v.m]; const g=ac.createGain(); g.gain.value=0.22*v.vel;
      const pan=ac.createStereoPanner?ac.createStereoPanner():null; s.connect(g); if(pan){pan.pan.value=panFor(v.m); g.connect(pan); pan.connect(bus);} else g.connect(bus); s.start(t); } }
  function pedalUp(){ if(!ac) return; const t=ac.currentTime; for(const m in voices){ voices[m].forEach(v=>{ if(v.sustained) release(v,t); }); voices[m]=voices[m].filter(v=>!v.done); } }
  function allOff(){ if(!ac) return; for(const m in voices){ voices[m].forEach(v=>release(v,ac.currentTime,true)); voices[m]=[]; } }
  function synthVoice(m,vel,t){ const f=440*Math.pow(2,(m-69)/12), g=ac.createGain(); g.connect(bus); const osc=[];
    [['triangle',1,0.5],['sine',2,0.18]].forEach(([type,mul,amp])=>{ const o=ac.createOscillator(); o.type=type; o.frequency.value=f*mul; const og=ac.createGain(); og.gain.value=amp; o.connect(og); og.connect(g); o.start(t); osc.push(o); });
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.35*vel,t+0.008); g.gain.setTargetAtTime(0.05*vel,t+0.01,0.6); return {m,g,osc,vel,level:0.35*vel}; }
  return {
    ctx, unlock, resume, load, noteOn, noteOff, pedalUp, allOff, S,
    get time(){ return ac?ac.currentTime:0; }, get ready(){ return ready; },
    setVolume(v){ S.volume=v; if(master) master.gain.setTargetAtTime(v,ac.currentTime,0.02); },
    setReverb(on){ S.reverb=on; if(wet) wet.gain.setTargetAtTime(on?0.3:0,ac.currentTime,0.1); },
    setSustain(on){ S.sustain=on; if(!on&&!S.pedal) pedalUp(); }, setPedal(on){ S.pedal=on; if(!on&&!S.sustain) pedalUp(); },
  };
})();
