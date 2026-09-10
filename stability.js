(()=>{
// Mobile audio stability layer: keep the shared Web Audio context alive and recover it if iOS/Android suspends it.
const get=()=>window.__instrumentLabAudio;
let keepAlive=null;
async function keepAudioAlive(){
  const a=get(),ctx=a?.context,master=a?.master;
  if(!ctx||!master)return;
  try{if(ctx.state!=='running')await ctx.resume()}catch(e){}
  if(!keepAlive){
    try{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.frequency.value=20;
      gain.gain.value=0.00001;
      osc.connect(gain);gain.connect(master);osc.start();
      keepAlive={osc,gain};
    }catch(e){}
  }
}
const wake=()=>{keepAudioAlive()};
['pointerdown','touchstart','keydown','mousedown','click','visibilitychange','pageshow','focus'].forEach(ev=>addEventListener(ev,wake,{passive:true,capture:true}));
setInterval(()=>{const a=get();if(a?.context?.state!=='running')keepAudioAlive()},2500);
// Avoid mobile browsers leaving a held note behind after focus/pointer transitions.
addEventListener('pagehide',()=>{const a=get();if(a?.context?.state==='running')try{a.context.suspend()}catch(e){}},{passive:true});
})();
