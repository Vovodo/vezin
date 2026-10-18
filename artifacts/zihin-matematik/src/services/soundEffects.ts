let context:AudioContext|undefined;
function tone(frequency:number,duration:number=0.12,type:OscillatorType='sine',volume=.045){
 try{context??=new AudioContext();if(context.state==='suspended')void context.resume();const osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.value=frequency;gain.gain.setValueAtTime(volume,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+duration);osc.connect(gain);gain.connect(context.destination);osc.start();osc.stop(context.currentTime+duration)}catch{/* Audio is optional and may be blocked by browser settings. */}
}
export const soundEffects={correct:()=>tone(620,.1),wrong:()=>tone(180,.18,'triangle',.035),streak:()=>{tone(660,.11);setTimeout(()=>tone(880,.16),100)},record:()=>{tone(523,.12);setTimeout(()=>tone(659,.12),110);setTimeout(()=>tone(784,.2),220)}};
