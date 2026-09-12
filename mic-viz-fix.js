(()=>{
const $=id=>document.getElementById(id);
let stream=null,source=null,inputGain=null,monitor=null,analyser=null,canvas=null,ctx=null,raf=0;
const audio=()=>window.__instrumentLabAudio||{};

function ui(){
  if($('micEasyPanel')) return;
  const host=$('visualizer'); if(!host)return;
  const card=document.createElement('div'); card.id='micEasyPanel'; card.className='card labCard';
  card.innerHTML=`<div class="sectionTitle">🎙 EASY MIC SETUP</div>
  <div class="hint" id="micHelp">Tap <b>Enable Microphone</b> once, allow Microphone, then speak. Your voice will go to the visualizer and phone audio output.</div>
  <div class="labRow">
    <button id="micEasyStart" class="primary" type="button">🎙 Enable Microphone</button>
    <button id="micEasyStop" type="button">■ Turn Mic Off</button>
    <label class="toggle"><input id="micEasyMonitor" type="checkbox" checked><span>🔊 Speaker Output</span></label>
  </div>
  <label>Mic Level <input id="micEasyLevel" type="range" min="0" max="1.5" step=".01" value="1"><output id="micEasyLevelOut">100%</output></label>
  <div class="hint" id="micEasyStatus">Not connected yet.</div>`;
  host.insertBefore(card,host.querySelector('#visualizerBox'));
  $('micEasyStart').onclick=start;
  $('micEasyStop').onclick=stop;
  $('micEasyMonitor').onchange=()=>setMonitor($('micEasyMonitor').checked);
  $('micEasyLevel').oninput=e=>{ $('micEasyLevelOut').textContent=Math.round(+e.target.value*100)+'%'; if(inputGain)inputGain.gain.value=+e.target.value; };
}

function setupAnalyser(a){
  if(analyser)return analyser;
  analyser=a.context.createAnalyser(); analyser.fftSize=1024; analyser.smoothingTimeConstant=.65;
  const box=$('visualizerBox'); if(!box)return analyser;
  canvas=document.createElement('canvas'); canvas.id='micLiveLevel'; canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
  box.style.position='relative'; box.appendChild(canvas); ctx=canvas.getContext('2d');
  const resize=()=>{const r=box.getBoundingClientRect(),d=devicePixelRatio||1;canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0)};
  addEventListener('resize',resize); resize();
  const draw=()=>{raf=requestAnimationFrame(draw);const w=box.clientWidth,h=box.clientHeight;if(!w||!h)return;const data=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(data);let sum=0;for(const n of data){const x=(n-128)/128;sum+=x*x}const level=Math.min(1,Math.sqrt(sum/data.length)*4);ctx.clearRect(0,0,w,h);ctx.beginPath();ctx.lineWidth=3;ctx.moveTo(16,h-22);ctx.lineTo(16+(w-32)*level,h-22);ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent')||'#d946ef';ctx.stroke()};draw();
  return analyser;
}

async function start(){
  ui();
  const a=audio();
  if(!a.context||!a.master){
    $('micEasyStatus').textContent='First tap ▶ Start Audio, then tap Enable Microphone.'; return;
  }
  try{if(a.context.state!=='running')await a.context.resume();}catch(e){}
  if(!navigator.mediaDevices?.getUserMedia){$('micEasyStatus').textContent='Microphone access is unavailable in this browser.';return}
  try{
    stop(false);
    // Keep the request deliberately simple for iPhone/iPad compatibility.
    stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    source=a.context.createMediaStreamSource(stream);
    inputGain=a.context.createGain(); inputGain.gain.value=+$('micEasyLevel').value;
    const comp=a.context.createDynamicsCompressor(); comp.threshold.value=-18; comp.knee.value=18; comp.ratio.value=3; comp.attack.value=.005; comp.release.value=.15;
    setupAnalyser(a);
    source.connect(inputGain); inputGain.connect(comp); comp.connect(analyser);
    monitor=a.context.createGain(); monitor.gain.value=$('micEasyMonitor').checked?1:0; comp.connect(monitor); monitor.connect(a.master);
    $('micEasyStart').textContent='✓ Microphone Active'; $('micEasyStatus').textContent='Working. Speak now — level bar should move.';
    $('fileName').textContent='🎙 Live microphone'; $('status').textContent='Microphone active · speaker output live';
    const old=$('mic'); if(old)old.textContent='🎙 Mic Active';
  }catch(e){
    const name=e?.name||'';
    let msg='Could not access the microphone.';
    if(name==='NotAllowedError'||name==='SecurityError')msg='Microphone permission was denied. In iPhone Settings → Safari → Microphone, choose Allow, then reload this page.';
    else if(name==='NotFoundError')msg='No microphone was found.';
    else if(name==='NotReadableError'||name==='AbortError')msg='The microphone is busy. Close other apps using the mic, then try again.';
    else if(name==='TypeError')msg='This page needs a secure HTTPS connection for microphone access.';
    $('micEasyStatus').textContent=msg;
    $('status').textContent='Microphone unavailable';
  }
}
function setMonitor(on){if(monitor)monitor.gain.setTargetAtTime(on?1:0,audio().context.currentTime,.01)}
function stop(update=true){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;[source,inputGain,monitor].forEach(n=>{try{n?.disconnect()}catch(e){}});source=inputGain=monitor=null;if(update){if($('micEasyStart'))$('micEasyStart').textContent='🎙 Enable Microphone';if($('micEasyStatus'))$('micEasyStatus').textContent='Microphone off.';$('status').textContent='Microphone off'}}

ui();
// This is the final mic handler, intentionally replacing the older competing handlers.
if($('mic'))$('mic').onclick=e=>{e.preventDefault();e.stopImmediatePropagation();start()};
if($('micStop'))$('micStop').onclick=e=>{e.preventDefault();e.stopImmediatePropagation();stop()};
})();