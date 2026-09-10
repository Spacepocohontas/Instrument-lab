(()=>{
  const $=id=>document.getElementById(id);
  const keys=['A','W','S','E','D','F','T','G','Y','H','U','J','K'];
  let midi=null,pressed=new Map();
  const midiBtn=document.createElement('button');
  midiBtn.id='midi'; midiBtn.textContent='🎹 MIDI'; midiBtn.title='Connect a MIDI keyboard';
  $('audioStart')?.after(midiBtn);
  const setStatus=t=>{if($('status'))$('status').textContent=t};

  // iOS Safari: use Pointer Events for the playable keys and suppress the
  // legacy touch handlers so one finger cannot trigger the same note twice.
  document.querySelectorAll('.key').forEach(b=>{
    b.addEventListener('touchstart',e=>e.stopImmediatePropagation(),true);
    b.addEventListener('touchend',e=>e.stopImmediatePropagation(),true);
    b.addEventListener('touchcancel',e=>e.stopImmediatePropagation(),true);
  });

  const keyForMidi=n=>{const delta=n-60;return delta>=0&&delta<13?keys[delta]:null};
  const octaveForMidi=n=>Math.floor((n-60)/12);
  function sendKey(type,key){window.dispatchEvent(new KeyboardEvent(type,{key,bubbles:true}))}
  function midiMessage(e){
    const [status,note,velocity]=e.data||[];const cmd=status&0xf0;const key=keyForMidi(note);if(!key)return;
    const oct=octaveForMidi(note);
    if(cmd===0x90&&velocity>0){
      if(pressed.has(note))return;
      const shown=Math.max(-3,Math.min(3,oct));
      while((+$('octave')?.textContent||0)<shown){$('octPlus')?.click()}
      while((+$('octave')?.textContent||0)>shown){$('octMinus')?.click()}
      pressed.set(note,key);sendKey('keydown',key);
    }else if(cmd===0x80||(cmd===0x90&&velocity===0)){
      if(pressed.has(note)){sendKey('keyup',pressed.get(note));pressed.delete(note)}
    }
  }
  async function connectMIDI(){
    if(!navigator.requestMIDIAccess){setStatus('MIDI not supported in this browser');return}
    try{
      midi=await navigator.requestMIDIAccess();let count=0;
      for(const input of midi.inputs.values()){input.onmidimessage=midiMessage;count++}
      midi.onstatechange=()=>{for(const input of midi.inputs.values())input.onmidimessage=midiMessage;setStatus(`MIDI ready · ${midi.inputs.size} input${midi.inputs.size===1?'':'s'}`)};
      setStatus(count?`MIDI ready · ${count} input${count===1?'':'s'}`:'MIDI ready · connect a controller');midiBtn.textContent='✓ MIDI';
    }catch(err){setStatus('MIDI connection failed')}
  }
  midiBtn.onclick=connectMIDI;

  const box=$('visualizerBox'),file=$('file');
  if(box){
    ['dragenter','dragover'].forEach(ev=>box.addEventListener(ev,e=>{e.preventDefault();box.classList.add('dropReady')}));
    ['dragleave','drop'].forEach(ev=>box.addEventListener(ev,e=>{e.preventDefault();box.classList.remove('dropReady')}));
    box.addEventListener('drop',e=>{
      const f=e.dataTransfer?.files?.[0];
      if(!f||!f.type.startsWith('audio/')){setStatus('Drop an audio file');return}
      const dt=new DataTransfer();dt.items.add(f);file.files=dt.files;file.dispatchEvent(new Event('change',{bubbles:true}));
    });
  }
  addEventListener('beforeunload',()=>pressed.forEach(key=>sendKey('keyup',key)));
})();
