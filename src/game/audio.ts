/** Procedural audio: ZzFX (MIT, Frank Force) for effects, a tiny Web Audio sequencer for music. No sampled assets. */
// Audio starts only after a user gesture (Chrome autoplay policy): the context and ZzFX are created lazily in unlockAudio().
let ZZFX:any=null,ctx:AudioContext=null as unknown as AudioContext,master:GainNode,sfxBus:GainNode,musicBus:GainNode,pending:Track='none';
const cache=new Map<string,AudioBuffer>();
let sfxOn=true,musicOn=true;

type P=(number|undefined)[];
const S:Record<string,P>={
 click:[.45,0,520,0,.01,.04,1,1.8,,,,,,,,,,.6],
 hover:[.12,0,980,0,0,.025,0,1.5],
 back:[.4,0,360,0,.01,.06,1,1.5,,,-120,.03],
 confirm:[.55,0,620,.01,.05,.16,1,1.5,,,330,.05],
 coin:[.45,0,1500,0,.02,.2,1,1.8,,,820,.04],
 fail:[1,0,92,.02,.12,.38,3,1,-3,,,,,1.2,,.25],
 whoosh:[.5,0,220,.1,.1,.22,4,1,,,,,,3,,,,.5],
 impact:[1.3,0,58,0,.12,.7,4,1.6,,,,,,1.6,,.35,.04],
 charge:[.55,0,180,.7,.45,.2,0,1,3.5,,,,,,,,,.6],
 sparkle:[.35,0,1900,0,.04,.25,0,1.2,,,600,.03,.05],
 gate:[1,0,140,0,.06,.32,3,1,,,,,,.6],
 beep:[.55,0,880,0,.08,.08,0,1],
 go:[.7,0,1760,0,.18,.2,0,1],
 bell:[.9,0,1180,0,.3,1.3,0,1,,,,,,,,,.12,.5],
 crowd:[.35,0,320,.35,1.2,1.1,4,1,,,,,,4,,,,.6,,.12,600],
 stamp:[1,0,120,0,.03,.22,2,1.4,,,,,,1.5,,.2],
 level:[.6,0,523,.01,.08,.3,0,1.2,,,523,.08,.08],
 skill:[.8,0,300,.02,.15,.4,2,1.4,6,,,,,.4,,,.06,.7],
};
function play(params:P,vol=1,rate=1){if(!sfxOn||!ZZFX||!ctx)return;const key=params.join(',');let buf=cache.get(key);if(!buf){const s=(ZZFX as any).buildSamples(...params) as number[];buf=ctx.createBuffer(1,s.length,(ZZFX as any).sampleRate);buf.getChannelData(0).set(s);cache.set(key,buf);}const src=ctx.createBufferSource();src.buffer=buf;src.playbackRate.value=rate;const g=ctx.createGain();g.gain.value=vol*.5;src.connect(g).connect(sfxBus);src.start();}
export const sfx=(name:keyof typeof S|string,vol=1,rate=1)=>{const p=S[name];if(p)play(p,vol,rate);};
/** Rising chime: pitch climbs with the size of the gain. */
export function chime(step:number,vol=.7){play([.5,0,523*2**(Math.min(16,step)/12),0,.03,.22,0,1.6,,,,,,,,,.06],vol);}
export function arpeggio(notes:number[],gap=.07,vol=.6){notes.forEach((n,i)=>setTimeout(()=>play([.5,0,262*2**(n/12),0,.04,.3,0,1.4,,,,,,,,,.08],vol),i*gap*1000));}
export function fanfare(){arpeggio([0,4,7,12,16,19,24],.09,.7);setTimeout(()=>sfx('bell',.6),650);}
export function unlockAudio(){if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=.9;master.connect(ctx.destination);sfxBus=ctx.createGain();sfxBus.connect(master);musicBus=ctx.createGain();musicBus.gain.value=0;musicBus.connect(master);
 import('zzfx').then(m=>{ZZFX=m.ZZFX;}).catch(()=>{});const t=pending;pending='none';track='none';if(t!=='none')music(t);}
 if(ctx.state!=='running')ctx.resume().catch(()=>{});}
export function setAudio(o:{sfx?:boolean;bgm?:boolean}){if(o.sfx!==undefined)sfxOn=o.sfx;if(o.bgm!==undefined&&musicBus){musicOn=o.bgm;musicBus.gain.setTargetAtTime(musicOn&&track!=='none'?.16:0,ctx.currentTime,.3);}}

// ── Music ──
type Track='none'|'home'|'race'|'tension';
let track:Track='none',step=0,next=0,timer=0;
const tempo={home:104,race:148,tension:120,none:100};
const prog=[[0,4,7],[7,11,14],[9,12,16],[5,9,12]];// I V vi IV
function tone(type:OscillatorType,freq:number,t:number,dur:number,vol:number,cutoff=4000){const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(f).connect(g).connect(musicBus);o.start(t);o.stop(t+dur+.05);}
let noiseBuf:AudioBuffer|null=null;
function noise(t:number,dur:number,vol:number,hp:number){if(!noiseBuf){noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();s.buffer=noiseBuf;f.type='highpass';f.frequency.value=hp;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(musicBus);s.start(t);s.stop(t+dur+.02);}
function kick(t:number){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g).connect(musicBus);o.start(t);o.stop(t+.3);}
const hz=(n:number,root=55)=>root*2**(n/12);
function schedule(t:number,s:number){const bar=Math.floor(s/16)%4,beat=s%16,chord=prog[bar];
 if(track==='home'){if(beat%4===0)tone('triangle',hz(chord[0],110),t,.9,.12,1200);const arp=[0,1,2,1,0,2,1,2];if(beat%2===0)tone('sine',hz(chord[arp[(beat/2)%8]]+12,220),t,.35,.07,3000);if(beat===0)for(const n of chord)tone('triangle',hz(n,220),t,2.4,.035,1800);if(beat%8===4)noise(t,.05,.04,7000);}
 else if(track==='race'){if(beat%4===0)kick(t);if(beat%4===2)noise(t,.05,.12,8000);if(beat===4||beat===12)noise(t,.14,.18,1800);tone('sawtooth',hz(chord[0]+(beat%2?12:0),55),t,.13,.13,900);const lead=[12,7,4,7,14,7,4,7,16,12,7,12,14,11,7,11];if(beat%2===0&&bar%2===1)tone('square',hz(chord[0]+lead[beat],440),t,.12,.035,2600);if(beat===0)for(const n of chord)tone('sawtooth',hz(n,220),t,1.8,.02,1400);}
 else if(track==='tension'){if(beat%8===0)kick(t);tone('sawtooth',hz(beat%2?7:0,55),t,.15,.1,700);if(beat%4===2)noise(t,.04,.06,9000);}}
function tick(){const spb=60/tempo[track]/4;while(next<ctx.currentTime+.12){schedule(next,step++);next+=spb;}}
export function music(t:Track){if(!ctx){pending=t;return;}if(t===track)return;track=t;clearInterval(timer);musicBus.gain.cancelScheduledValues(ctx.currentTime);musicBus.gain.setTargetAtTime(musicOn&&t!=='none'?.16:0,ctx.currentTime,.25);if(t==='none')return;step=0;next=ctx.currentTime+.08;timer=window.setInterval(tick,25);}
