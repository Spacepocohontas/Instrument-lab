(()=>{
const $=id=>document.getElementById(id);
let stream=null,source=null,inputGain=null,preComp=null,makeup=null,limiter=null,monitor=null,analyser=null,canvas=null,ctx=null;
const audio=()=>window.__instrumentLabAudio||{};
function ui(){
 if($('micEasyPanel'))return; const host=$('visualizer');if(!host)return;
 const card=document.createElement('div');card.id='micEasyPanel';card.className='card labCard';
 card.innerHTML=`<div class="sectionTitle">🎙 POWER MIC — GARAGEBAND STYLE</div><div class="hint" id="micHelp">Tap <b>Enable Microphone</b>, allow Microphone, then speak. Clean iPhone mic audio is boosted, compressed and protected by a limiter before going to the visualizer + phone speaker.</div><div class="labRow"><button id="micEasyStart" class="primary" type="button">🎙 Enable Microphone</button><button id="micEasyStop" type="button">■ Turn Mic Off</button><label class="toggle"><input id="micEasyMonitor" type="checkbox" checked><span>🔊 Speaker Output</span></label></div><label>🔥 Mic Power <input id="micEasyLevel" type="range" min="0" max="3" step=".01" value="1.5"><output id="micEasyLevelOut">150%</output></label><div class="hint" id="micEasyStatus">Not connected yet. Power mode = preamp + punchy compression + safety limiter.</div>`;
 host.insertBefore(card,host.querySelector('#visualizerBox'));
 $('micEasyStart').onclick=start;$('micEasyStop').onclick=stop;$('micEasyMonitor').onchange=()=>setMonitor($('micEasyMonitor').checked);
 $('micEasyLevel').oninput=e=>{$('micEasyLevelOut').textContent=Math.round(+e.target.value*100)+'%';if(inputGain)inputGain.gain.setTargetAtTime(+e.target.value,inputGain.context.currentTime,.01)};
}
function setupAnalyser(a){
 if(analyser)return analyser;analyser=a.context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.65;
 const box=$('visualizerBox');if(!box)return analyser;canvas=document.createElement('canvas');canvas.id='micLiveLevel';canvas.style.cssText='position:absolute;left:0;right:0;bottom:0;width:100%;height:22px;pointer-events:none;z-index:5';box.style.position='relative';box.appendChild(canvas);ctx=canvas.getContext('2d');
 const resize=()=>{const r=canvas.getBoundingClientRect(),d=devicePixelRatio||1;canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0)};addEventListener('resize',resize);resize();
 const draw=()=>{requestAnimationFrame(draw);const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const data=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(data);let sum=0;for(const n of data){const x=(n-128)/128;sum+=x*x}const level=Math.min(1,Math.sqrt(sum/data.length)*4);ctx.clearRect(0,0,w,h);ctx.beginPath();ctx.lineWidth=4;ctx.moveTo(8,h/2);ctx.lineTo(8+(w-16)*level,h/2);ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent')||'#d946ef';ctx.stroke()};draw();return analyser;
}
async function start(){
 ui();let a=audio();
 if(!a.context||!a.master){$('audioStart')?.click();await new Promise(r=>setTimeout(r,80));a=audio()}
 if(!a.context||!a.master){$('micEasyStatus').textContent='Tap ▶ Start Audio once, then Enable Microphone.';return}
 try{if(a.context.state!=='running')await a.context.resume()}catch(e){}
 if(!navigator.mediaDevices?.getUserMedia){$('micEasyStatus').textContent='Microphone access is unavailable in this browser.';return}
 try{
  stop(false);
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1},video:false});
  source=a.context.createMediaStreamSource(stream);
  inputGain=a.context.createGain();inputGain.gain.value=+$('micEasyLevel').value;
  preComp=a.context.createDynamicsCompressor();preComp.threshold.value=-30;preComp.knee.value=24;preComp.ratio.value=6;preComp.attack.value=.003;preComp.release.value=.12;
  makeup=a.context.createGain();makeup.gain.value=1.35;
  limiter=a.context.createDynamicsCompressor();limiter.threshold.value=-3;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.001;limiter.release.value=.08;
  setupAnalyser(a);
  source.connect(inputGain);inputGain.connect(preComp);preComp.connect(makeup);makeup.connect(limiter);limiter.connect(analyser);
  monitor=a.context.createGain();monitor.gain.value=$('micEasyMonitor').checked?1:0;limiter.connect(monitor);monitor.connect(a.master);
  window.__instrumentLabMicOutput=limiter;window.__instrumentLabMicMonitor=monitor;window.__instrumentLabMicPreamp=inputGain;
  $('micEasyStart').textContent='✓ Power Mic Active';$('micEasyStatus').textContent='POWER MIC ON. Stronger level + compression + safety limiter. Speak now.';$('fileName').textContent='🎙 Power microphone live';$('status').textContent='Power microphone active · speaker output live';if($('mic'))$('mic').textContent='🎙 Power Mic Active';
 }catch(e){const n=e?.name||'';let msg='Could not access the microphone.';if(n==='NotAllowedError'||n==='SecurityError')msg='Permission denied. iPhone Settings → Safari → Microphone → Allow, then reload.';else if(n==='NotFoundError')msg='No microphone was found.';else if(n==='NotReadableError'||n==='AbortError')msg='The microphone is busy. Close other apps using it, then try again.';else if(n==='TypeError')msg='Microphone access needs the secure HTTPS site.';$('micEasyStatus').textContent=msg;$('status').textContent='Microphone unavailable'}
}
function setMonitor(on){const a=audio();if(monitor&&a.context)monitor.gain.setTargetAtTime(on?1:0,a.context.currentTime,.01)}
function stop(update=true){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;[source,inputGain,preComp,makeup,limiter,monitor].forEach(n=>{try{n?.disconnect()}catch(e){}});source=inputGain=preComp=makeup=limiter=monitor=null;window.__instrumentLabMicOutput=null;window.__instrumentLabMicMonitor=null;window.__instrumentLabMicPreamp=null;if(update){if($('micEasyStart'))$('micEasyStart').textContent='🎙 Enable Microphone';if($('micEasyStatus'))$('micEasyStatus').textContent='Microphone off.';$('status').textContent='Microphone off'}}
ui();if($('mic'))$('mic').onclick=e=>{e.preventDefault();e.stopImmediatePropagation();start()};if($('micStop'))$('micStop').onclick=e=>{e.preventDefault();e.stopImmediatePropagation();stop()};
})();