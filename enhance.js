(()=>{
  const $=id=>document.getElementById(id);
  const keys=[['A',60],['W',61],['S',62],['E',63],['D',64],['F',65],['T',66],['G',67],['Y',68],['H',69],['U',70],['J',71],['K',72]];
  const keyNames=new Set(keys.map(x=>x[0]));
  let midi=null,pressedMidi=new Map(),iosVoices=new Map(),unlocked=false;
  const setStatus=t=>{if($('status'))$('status').textContent=t};

  // iOS/Safari hardening: keep the entire keyboard interaction on Pointer Events,
  // use touch-action:none, and create the tone from the same AudioContext after the
  // first user gesture. This avoids the common "button highlights but no sound" path.
  const style=document.createElement('style');
  style.textContent='.key{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.key.down{transform:translateY(2px)}';
  document.head.appendChild(style);

  async function getAudio(){
    const api=window.__instrumentLabAudio;
    let ctx=api?.context;
    if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
    try{if(ctx.state!=='running')await ctx.resume()}catch(e){}
    if(api?.master)return {ctx,master:api.master};
    return {ctx,master:ctx.destination};
  }
  const hz=m=>440*Math.pow(2,(m-69)/12);
  async function iosNoteOn(name){
    if(iosVoices.has(name))return;
    const x=await getAudio();
    if(!x?.ctx)return;
    const wave=$('wave')?.value||'sawtooth';
    const vol=Math.min(.35,Math.max(.03,(+$('volume')?.value||.7)*.5));
    const octave=Math.max(-3,Math.min(3,+$('octave')?.textContent||0));
    const m=(keys.find(k=>k[0]===name)?.[1]??60)+octave*12;
    const o=x.ctx.createOscillator(),g=x.ctx.createGain();
    o.type=wave;o.frequency.value=hz(m);
    const t=x.ctx.currentTime,a=Math.max(.002,+$('attack')?.value||.01);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+a);
    o.connect(g);g.connect(x.master);o.start();
    iosVoices.set(name,{o,g,ctx:x.ctx});
    $('noteReadout')&&($('noteReadout').textContent=`${name} · ${hz(m).toFixed(1)} Hz`);
    document.querySelector(`[data-key="${name}"]`)?.classList.add('down');
    unlocked=true;
  }
  function iosNoteOff(name){
    const v=iosVoices.get(name);if(!v)return;
    const t=v.ctx.currentTime,r=Math.max(.015,+$('release')?.value||.08);
    try{v.g.gain.cancelScheduledValues(t);v.g.gain.setValueAtTime(Math.max(.0001,v.g.gain.value),t);v.g.gain.exponentialRampToValueAtTime(.0001,t+r);v.o.stop(t+r+.03)}catch(e){}
    iosVoices.delete(name);document.querySelector(`[data-key="${name}"]`)?.classList.remove('down');
  }

  // Capture-phase handlers take ownership on iOS so the legacy touch + pointer
  // handlers cannot double-trigger a note.
  document.querySelectorAll('.key').forEach(b=>{
    const name=b.dataset.key;
    b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopImmediatePropagation();b.setPointerCapture?.(e.pointerId);iosNoteOn(name)},{capture:true,passive:false});
    b.addEventListener('pointerup',e=>{e.preventDefault();e.stopImmediatePropagation();iosNoteOff(name)},{capture:true,passive:false});
    b.addEventListener('pointercancel',e=>{e.preventDefault();e.stopImmediatePropagation();iosNoteOff(name)},{capture:true,passive:false});
    b.addEventListener('lostpointercapture',()=>iosNoteOff(name),{capture:true});
    b.addEventListener('touchstart',e=>{e.preventDefault();e.stopImmediatePropagation()},{capture:true,passive:false});
    b.addEventListener('touchend',e=>{e.preventDefault();e.stopImmediatePropagation()},{capture:true,passive:false});
    b.addEventListener('touchcancel',e=>{e.preventDefault();e.stopImmediatePropagation();iosNoteOff(name)},{capture:true,passive:false});
  });
  addEventListener('blur',()=>[...iosVoices.keys()].forEach(iosNoteOff));

  // A visible one-tap unlock fallback for iOS audio policies.
  const unlock=document.createElement('button');
  unlock.id='iosAudioUnlock';unlock.type='button';unlock.textContent='🔊 Enable iPhone Audio';
  unlock.style.cssText='margin:.5rem 0;display:block;width:100%;font-weight:700;';
  $('audioStart')?.after(unlock);
  unlock.onclick=async()=>{try{await getAudio();setStatus('iPhone audio unlocked · play the keys');unlock.textContent='✓ iPhone Audio Ready';unlocked=true}catch(e){setStatus('Tap again to enable audio')}};

  // MIDI support.
  const midiBtn=document.createElement('button');
  midiBtn.id='midi';midiBtn.type='button';midiBtn.textContent='🎹 MIDI';midiBtn.title='Connect a MIDI keyboard';
  unlock.after(midiBtn);
  const keyForMidi=n=>{const d=n-60;return d>=0&&d<13?keys[d][0]:null};
  const octaveForMidi=n=>Math.floor((n-60)/12);
  function sendKey(type,key){window.dispatchEvent(new KeyboardEvent(type,{key,bubbles:true}))}
  function midiMessage(e){
    const [status,note,velocity]=e.data||[],cmd=status&240,key=keyForMidi(note);if(!key)return;
    const target=Math.max(-3,Math.min(3,octaveForMidi(note)));
    if(cmd===144&&velocity>0){if(pressedMidi.has(note))return;while((+$('octave')?.textContent||0)<target)$('octPlus')?.click();while((+$('octave')?.textContent||0)>target)$('octMinus')?.click();pressedMidi.set(note,key);sendKey('keydown',key)}
    else if(cmd===128||(cmd===144&&velocity===0)){if(pressedMidi.has(note)){sendKey('keyup',pressedMidi.get(note));pressedMidi.delete(note)}}
  }
  midiBtn.onclick=async()=>{if(!navigator.requestMIDIAccess){setStatus('MIDI is not supported in this browser');return}try{midi=await navigator.requestMIDIAccess();for(const i of midi.inputs.values())i.onmidimessage=midiMessage;midi.onstatechange=()=>{for(const i of midi.inputs.values())i.onmidimessage=midiMessage;setStatus(`MIDI ready · ${midi.inputs.size} input${midi.inputs.size===1?'':'s'}`)};setStatus(`MIDI ready · ${midi.inputs.size} input${midi.inputs.size===1?'':'s'}`);midiBtn.textContent='✓ MIDI'}catch(e){setStatus('MIDI connection failed')}};

  // Drag/drop audio into the visualizer.
  const box=$('visualizerBox'),file=$('file');
  if(box&&file){
    ['dragenter','dragover'].forEach(ev=>box.addEventListener(ev,e=>{e.preventDefault();box.classList.add('dropReady')}));
    ['dragleave','drop'].forEach(ev=>box.addEventListener(ev,e=>{e.preventDefault();box.classList.remove('dropReady')}));
    box.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(!f||!f.type.startsWith('audio/')){setStatus('Drop an audio file');return}const dt=new DataTransfer();dt.items.add(f);file.files=dt.files;file.dispatchEvent(new Event('change',{bubbles:true}))});
  }
  addEventListener('beforeunload',()=>{pressedMidi.forEach(key=>sendKey('keyup',key));iosVoices.forEach((_,key)=>iosNoteOff(key))});
})();
