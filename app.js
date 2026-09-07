(()=>{
const $=id=>document.getElementById(id);
let ac,master,analyser,oct=0,voices=new Map(),therOsc,therGain,therWet,therDelay,therFeedback,therOn=false,muted=false;
let fileAudio,fileSource,micStream,micSource,recordDest,recorder,recordChunks=[];
const keys=[['A',60],['W',61],['S',62],['E',63],['D',64],['F',65],['T',66],['G',67],['Y',68],['H',69],['U',70],['J',71],['K',72]];
const freq=m=>440*Math.pow(2,(m-69)/12);
function audio(){
 ac??=new(window.AudioContext||window.webkitAudioContext)();
 if(ac.state==='suspended')ac.resume();
 if(!master){
  master=ac.createGain();master.gain.value=+$('volume').value;
  analyser=ac.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.82;
  recordDest=ac.createMediaStreamDestination();master.connect(analyser);analyser.connect(ac.destination);master.connect(recordDest);
 }
 $('status').textContent='Audio ready';$('led').parentElement.classList.add('ready');$('audioStart').textContent='✓ Audio Ready';
}
$('audioStart').onclick=audio;
function updateOut(id,v){$(id).textContent=v}
function noteOn(m,k){
 audio();if(voices.has(k))return;
 const o=ac.createOscillator(),g=ac.createGain(),f=ac.createBiquadFilter();
 o.type=$('wave').value;o.frequency.value=freq(m+oct*12);f.type='lowpass';f.frequency.value=+$('cutoff').value;f.Q.value=+$('resonance').value;
 const t=ac.currentTime,a=+$('attack').value,d=+$('decay').value,s=+$('sustain').value;
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.72,t+a);g.gain.exponentialRampToValueAtTime(Math.max(.0001,.72*s),t+a+d);
 o.connect(f);f.connect(g);g.connect(master);o.start();voices.set(k,{o,g,f});
 document.querySelector(`[data-key="${k}"]`)?.classList.add('down');$('noteReadout').textContent=`${k} · ${freq(m+oct*12).toFixed(1)} Hz`;
}
function noteOff(k){const v=voices.get(k);if(!v||!ac)return;const t=ac.currentTime,r=+$('release').value;v.g.gain.cancelScheduledValues(t);v.g.gain.setValueAtTime(Math.max(.0001,v.g.gain.value),t);v.g.gain.exponentialRampToValueAtTime(.0001,t+r);v.o.stop(t+r+.04);voices.delete(k);document.querySelector(`[data-key="${k}"]`)?.classList.remove('down')}
keys.forEach(([k,m])=>{const b=document.createElement('button');b.className='key';b.dataset.key=k;b.textContent=k;b.dataset.m=m;$('keyboard').appendChild(b)});
['W','E','T','Y','U'].forEach(k=>document.querySelector(`[data-key="${k}"]`).classList.add('black'));
function begin(k){const x=keys.find(a=>a[0]===k.toUpperCase());if(x)noteOn(x[1],x[0])}
document.querySelectorAll('.key').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);begin(b.dataset.key)};b.onpointerup=()=>noteOff(b.dataset.key);b.onpointercancel=()=>noteOff(b.dataset.key);b.onpointerleave=()=>{if(e?.buttons)noteOff(b.dataset.key)}});
addEventListener('keydown',e=>{if(e.repeat)return;const k=e.key.toUpperCase();if(k==='Z'){oct=Math.max(-3,oct-1);$('octave').textContent=oct;return}if(k==='X'){oct=Math.min(3,oct+1);$('octave').textContent=oct;return}begin(k)});
addEventListener('keyup',e=>noteOff(e.key.toUpperCase()));addEventListener('blur',()=>[...voices.keys()].forEach(noteOff));
$('octMinus').onclick=()=>{oct=Math.max(-3,oct-1);$('octave').textContent=oct};$('octPlus').onclick=()=>{oct=Math.min(3,oct+1);$('octave').textContent=oct};$('panic').onclick=()=>[...voices.keys()].forEach(noteOff);
$('volume').oninput=e=>{updateOut('volumeOut',Math.round(e.target.value*100)+'%');if(master)master.gain.setTargetAtTime(+e.target.value,ac.currentTime,.02)};
$('cutoff').oninput=e=>{updateOut('cutoffOut',(+e.target.value/1000).toFixed(1)+'k');voices.forEach(v=>v.f.frequency.setTargetAtTime(+e.target.value,ac.currentTime,.02))};
$('resonance').oninput=e=>{updateOut('resOut',(+e.target.value).toFixed(1));voices.forEach(v=>v.f.Q.value=+e.target.value)};
$('attack').oninput=e=>updateOut('attackOut',Math.round(e.target.value*1000)+'ms');$('decay').oninput=e=>updateOut('decayOut',Math.round(e.target.value*1000)+'ms');$('sustain').oninput=e=>updateOut('sustainOut',Math.round(e.target.value*100)+'%');$('release').oninput=e=>updateOut('releaseOut',Math.round(e.target.value*1000)+'ms');
function therInit(){audio();if(therOsc)return;therOsc=ac.createOscillator();therGain=ac.createGain();therWet=ac.createGain();therDelay=ac.createDelay(1);therFeedback=ac.createGain();therOsc.type=$('therWave').value;therGain.gain.value=0;therWet.gain.value=+$('reverb').value;therDelay.delayTime.value=.24;therFeedback.gain.value=.34;therOsc.connect(therGain);therGain.connect(master);therGain.connect(therDelay);therDelay.connect(therFeedback);therFeedback.connect(therDelay);therDelay.connect(therWet);therWet.connect(master);therOsc.start();therOn=true}
$('therStart').onclick=()=>{therInit();$('pitchReadout').textContent='Move to play'};$('therWave').onchange=e=>{if(therOsc)therOsc.type=e.target.value};
$('reverb').oninput=e=>{updateOut('reverbOut',Math.round(e.target.value*100)+'%');if(therWet)therWet.gain.setTargetAtTime(+e.target.value,ac.currentTime,.04)};
$('therMute').onclick=()=>{muted=!muted;$('therMute').textContent=muted?'🔇 Unmute':'🔊 Mute';if(therGain)therGain.gain.setTargetAtTime(muted?0:.0001,ac.currentTime,.03)};
function therMove(e){if(!therOn)return;const r=$('thereminPad').getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height)),hz=70*Math.pow(2,x*6.2),gain=muted?0:Math.pow(1-y,1.65)*.58;therOsc.frequency.setTargetAtTime(hz,ac.currentTime,.012);therGain.gain.setTargetAtTime(gain,ac.currentTime,.025);$('crosshair').style.left=x*100+'%';$('crosshair').style.top=y*100+'%';$('pitchReadout').textContent=hz.toFixed(1)+' Hz'}
$('thereminPad').onpointerdown=e=>{therInit();$('thereminPad').setPointerCapture(e.pointerId);therMove(e)};$('thereminPad').onpointermove=therMove;$('thereminPad').onpointerup=()=>{if(therGain)therGain.gain.setTargetAtTime(0,ac.currentTime,.05)};$('thereminPad').onpointercancel=()=>{if(therGain)therGain.gain.setTargetAtTime(0,ac.currentTime,.05)};
const scope=$('scope'),sv=scope.getContext('2d');
function resizeScope(){const r=scope.getBoundingClientRect(),d=devicePixelRatio||1;scope.width=Math.max(1,r.width*d);scope.height=Math.max(1,r.height*d);sv.setTransform(d,0,0,d,0,0)}
function drawScope(){requestAnimationFrame(drawScope);if(!analyser)return;const w=scope.clientWidth,h=scope.clientHeight;if(!w||!h)return;const data=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(data);sv.clearRect(0,0,w,h);sv.beginPath();sv.lineWidth=1.5;for(let i=0;i<data.length;i++){const x=i/(data.length-1)*w,y=(data[i]/255)*h;i?sv.lineTo(x,y):sv.moveTo(x,y)}sv.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent')||'#d946ef';sv.stroke()}
addEventListener('resize',resizeScope);resizeScope();drawScope();
const canvas=$('vizCanvas'),v=canvas.getContext('2d');
function resizeViz(){const r=$('visualizerBox').getBoundingClientRect(),d=devicePixelRatio||1;canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);v.setTransform(d,0,0,d,0,0)}addEventListener('resize',resizeViz);resizeViz();
function drawViz(){requestAnimationFrame(drawViz);const w=$('visualizerBox').clientWidth,h=$('visualizerBox').clientHeight;v.clearRect(0,0,w,h);if(!analyser)return;const a=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(a);const sens=+$('sensitivity').value,mode=$('vizMode').value,theme=$('theme').value,col={pink:'#d946ef',cyan:'#22d3ee',fire:'#fb923c',mono:'#fff'}[theme];v.fillStyle=col;v.strokeStyle=col;v.shadowBlur=10;v.shadowColor=col;if(mode==='bars'){const n=Math.min(96,Math.floor(w/7)),bw=w/n;for(let i=0;i<n;i++){const val=Math.min(1,a[Math.floor(i*a.length/n)]/255*sens),hh=val*h*.9;v.fillRect(i*bw+1,h-hh,bw-3,hh)}}else if(mode==='circular'){const cx=w/2,cy=h/2,base=Math.min(w,h)*.18;v.beginPath();v.arc(cx,cy,base,0,Math.PI*2);v.stroke();for(let i=0;i<120;i++){const val=a[Math.floor(i*a.length/120)]/255*sens,ang=i*Math.PI*2/120,r=base+val*Math.min(w,h)*.32;v.beginPath();v.moveTo(cx+Math.cos(ang)*base,cy+Math.sin(ang)*base);v.lineTo(cx+Math.cos(ang)*r,cy+Math.sin(ang)*r);v.stroke()}}else{v.beginPath();for(let i=0;i<700;i++){const val=a[Math.floor(i*a.length/700)]/255,y=h/2+(val-.5)*h*.85*sens,x=i/700*w;i?v.lineTo(x,y):v.moveTo(x,y)}v.stroke()}v.shadowBlur=0}
drawViz();
$('upload').onclick=()=>$('file').click();
$('file').onchange=e=>{const f=e.target.files?.[0];if(!f)return;audio();if(fileAudio){fileAudio.pause();fileAudio.removeAttribute('src')}fileAudio=new Audio(URL.createObjectURL(f));fileAudio.preload='auto';fileSource=ac.createMediaElementSource(fileAudio);fileSource.connect(master);$('fileName').textContent=f.name;$('play').textContent='▶ Play';$('status').textContent=f.name};
$('play').onclick=()=>{audio();if(!fileAudio)return;if(fileAudio.paused){fileAudio.play();$('play').textContent='Ⅱ Pause'}else{fileAudio.pause();$('play').textContent='▶ Play'}};
$('stopFile').onclick=()=>{if(fileAudio){fileAudio.pause();fileAudio.currentTime=0;$('play').textContent='▶ Play'}};
$('mic').onclick=async()=>{try{audio();micStream?.getTracks().forEach(t=>t.stop());micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});micSource=ac.createMediaStreamSource(micStream);micSource.connect(analyser);$('fileName').textContent='Microphone input active';$('status').textContent='Microphone active'}catch(e){$('status').textContent='Microphone permission denied'}};
$('fullscreen').onclick=()=>{$('visualizerBox').requestFullscreen?.()};$('sensitivity').oninput=e=>updateOut('sensOut',(+e.target.value).toFixed(2)+'×');
$('synthRecord').onclick=()=>{audio();if(recorder&&recorder.state==='recording'){recorder.stop();$('synthRecord').textContent='● Record';return}recordChunks=[];recorder=new MediaRecorder(recordDest.stream);recorder.ondataavailable=e=>e.data.size&&recordChunks.push(e.data);recorder.onstop=()=>{const blob=new Blob(recordChunks,{type:'audio/webm'}),url=URL.createObjectURL(blob);$('synthDownload').href=url;$('synthDownload').download='instrument-lab-session.webm';$('synthDownload').classList.remove('disabled');$('status').textContent='Recording ready'};recorder.start();$('synthRecord').textContent='■ Stop Recording';$('status').textContent='Recording synth output'};
function preset(){return Object.fromEntries(['wave','volume','cutoff','resonance','attack','decay','sustain','release','therWave','reverb','sensitivity','vizMode','theme'].map(id=>[id,$(id).value]))}
function applyPreset(p){Object.entries(p||{}).forEach(([id,val])=>{if($(id)){$(id).value=val;$(id).dispatchEvent(new Event('input'));$(id).dispatchEvent(new Event('change'))}})}
const save=document.createElement('button');save.textContent='💾 Save Preset';save.title='Save current controls locally';$('synthRecord').after(save);save.onclick=()=>{localStorage.setItem('instrument-lab-preset',JSON.stringify(preset()));$('status').textContent='Preset saved locally'};
const load=document.createElement('button');load.textContent='↺ Load Preset';load.title='Load your saved controls';save.after(load);load.onclick=()=>{try{const p=JSON.parse(localStorage.getItem('instrument-lab-preset')||'null');if(p){applyPreset(p);$('status').textContent='Preset loaded'}else $('status').textContent='No saved preset'}catch{$('status').textContent='Preset could not be loaded'}};
const reset=document.createElement('button');reset.textContent='Reset';reset.title='Reset controls to defaults';load.after(reset);reset.onclick=()=>{applyPreset({wave:'triangle',volume:'.35',cutoff:'6500',resonance:'1',attack:'.02',decay:'.15',sustain:'.65',release:'.3',therWave:'sine',reverb:'.25',sensitivity:'1',vizMode:'bars',theme:'pink'});$('status').textContent='Controls reset'};
document.querySelectorAll('.tab').forEach(tab=>tab.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===tab));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===tab.dataset.tab));if(tab.dataset.tab==='visualizer')setTimeout(resizeViz,0);if(tab.dataset.tab==='synth')setTimeout(resizeScope,0)});
})();