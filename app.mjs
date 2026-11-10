import {CATEGORIES,FOCUS,defaultState,ageError,calculate,tearGroups,hoursText,fixed,cleanState} from './model.mjs?v=2';
import {mountTimeLab} from './time-lab.mjs?v=2';

const STORE='paper-days-v1';
let state;
try{state=cleanState(JSON.parse(localStorage.getItem(STORE)));}catch{state=defaultState();}
let ripping=false,toastTimer;
let dayAnchor=null,labCleanup=null,labSource=null,labOrigin=state.pastTorn?'result':'welcome';
let soundEnabled=false,audioContext,tearBuffer;
const app=document.querySelector('#app');
const soundButton=document.querySelector('#sound-button');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cn=text=>`<span class="cn" lang="zh-CN">${text}</span>`;
const hint=(en,zh,cls='')=>`<p class="${cls}">${en}${cn(zh)}</p>`;
const zhHours=hours=>hoursText(hours).replace('h','小时').replace('m','分钟').replace(' ','');
const ageMessage=error=>error&&state.tips
 ? (error.startsWith('Enter')?'请输入 1 到 110 岁的整数。':'假设年龄要大于当前年龄，最多可填 120 岁。')
 : error;
const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(state));}catch{}};
const snapshot=()=>({budget:{...state.budget},focus:state.focus,decide:state.decide});
function icon(name){
 const paths={
 moon:'<path d="M19 14A8 8 0 0 1 10 5a8 8 0 1 0 9 9Z"/>',
 book:'<path d="M12 6v14M3 5c4-1 7 0 9 2 2-2 5-3 9-2v13c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
 pen:'<path d="m4 17-1 4 4-1L20 7l-3-3ZM14 7l3 3"/>',
 route:'<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8"/>',
 cup:'<path d="M5 9h12v7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5ZM17 10h2a3 3 0 0 1 0 6h-2M8 3v3M13 2v4"/>',
 heart:'<path d="M12 21 4 13C-3 6 7-1 12 6c5-7 15 0 8 7Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
 move:'<circle cx="14" cy="4" r="2"/><path d="m4 11 5-2 4-3 3 5 5 1M13 7l-2 8-5 6M11 15l6 3 1 4"/>',
 phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
 home:'<path d="m2 11 10-8 10 8M5 10v11h14V10M10 21v-7h4v7"/>',
 care:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
 dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
 };
 return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.dots}</svg>`;
}
function progress(){
 const names=['Your age','Your day','Small delays','Tear','Your time'],views=['age','day','delays','tear','result'];
 const labels=['撕下过去','安排一天','额外耗时','逐段撕纸','课堂讨论'];
 const ix=views.indexOf(state.view);
 return `<nav class="progress" aria-label="Game progress / 游戏进度">${names.map((n,i)=>`<span class="step ${i===ix?'active':i<ix?'done':''}" ${i===ix?'aria-current="step"':''}><b>${i+1}</b><span>${n}${cn(labels[i])}</span></span>`).join('')}</nav>`;
}
function navigate(view){
 if(ripping)return;
 if(view==='day'&&state.view!=='day')dayAnchor=snapshot();
 state.view=view;persist();render();window.scrollTo({top:0,behavior:'instant'});app.focus({preventScroll:true});
}
function showToast(message){
 const node=document.querySelector('#toast');node.textContent=message;node.classList.add('visible');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),2500);
}
function applyTips(){
 document.body.classList.toggle('no-tips',!state.tips);
 const b=document.querySelector('#tips-button');b.textContent='中文提示 '+(state.tips?'开':'关');b.setAttribute('aria-pressed',String(state.tips));
 const error=document.querySelector('#age-error');if(error)error.textContent=ageMessage(ageError(state));
}
function playTearSound(){
 if(!soundEnabled||!audioContext)return;
 if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
 const source=audioContext.createBufferSource();
 source.buffer=tearBuffer;
 source.connect(audioContext.destination);
 source.start();
}
function toggleSound(){
 if(soundEnabled){
  soundEnabled=false;
 }else{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio){showToast('当前浏览器无法播放音效，仍可继续撕纸。');return;}
  try{
   audioContext??=new Audio();
   if(!tearBuffer){
    const rate=audioContext.sampleRate;
    tearBuffer=audioContext.createBuffer(1,Math.floor(rate*.38),rate);
    const samples=tearBuffer.getChannelData(0);
    let previous=0;
    for(let i=0;i<samples.length;i++){
     const t=i/samples.length,noise=Math.random()*2-1;
     const envelope=Math.min(1,t*27)*(1-t)**1.5*(.35+.65*Math.sin(40*t)**2);
     samples[i]=(noise-previous)*envelope*.25;
     previous=noise;
    }
   }
   soundEnabled=true;
   playTearSound();
  }catch{soundEnabled=false;showToast('音效暂时无法播放，仍可继续撕纸。');}
 }
 soundButton.setAttribute('aria-pressed',String(soundEnabled));
 soundButton.querySelector('span').textContent=soundEnabled?'音效开':'音效关';
}
function welcome(){
 return `<section class="intro">
 <div><span class="eyebrow">PAPER DAYS / AN ENGLISH CLASSROOM GAME</span>
 <h1 class="welcome-title">${cn('时间撕纸游戏')}<span class="welcome-title-en">Your life on a strip of paper</span></h1>
 <p class="welcome-purpose cn" lang="zh-CN">把一生想象成一条纸。先撕掉已经过完的时间，再看看每天花在睡觉、上课、通勤和刷手机上的时间，累积几年会有多长。<strong>最后留下的那一段，就是你还可以自己安排的时间。</strong></p>
 <p class="welcome-purpose-en">Plan an ordinary day, tear off each part, and see how much time is still yours to choose.</p>
 <div class="button-row welcome-actions"><button class="button accent classroom-button" data-action="start">Take my strip ↗${cn('开始撕纸游戏')}</button><button class="button secondary classroom-button" data-open-lab>Watch a small change${cn('看看每天改变一点')}</button></div>
 <section class="classroom-guide cn" lang="zh-CN" aria-labelledby="classroom-guide-title">
 <h2 id="classroom-guide-title">按这 5 步玩</h2>
 <ol><li><b>撕下过去。</b>可以直接用示例的 18 岁和 80 岁。下拉灰纸或点「撕掉过去」。</li>
 <li><b>安排平常的一天。</b>填睡觉、上课、吃饭等大约各用多久。<strong>24 小时不用填满，留一点给第 3 步。</strong></li>
 <li><b>算上额外耗时。</b>想想任务因分心多花多久，以及额外的犹豫或等待。只加前面没算过的时间。</li>
 <li><b>逐段撕纸。</b>下拉彩纸或点「撕下这一段」，看看每天一点时间，累积一年有多少。</li>
 <li><b>看结果，和同桌聊一聊。</b>哪一段最让你意外？如果每天腾出 15 分钟，你想留给什么？</li></ol>
 </section>
 <p class="intro-note cn" lang="zh-CN">年龄只是游戏设定。想听撕纸声，点右上角「音效关」开启。</p>
 </div>
 <div class="paper-art" aria-hidden="true"><div class="art-caption">One long strip.<svg viewBox="0 0 50 50"><path d="M40 5Q15 12 15 38m0 0-6-9m6 9 8-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></div>
 <div class="paper-length"><span class="paper-year" style="top:8px">0</span><span class="paper-year" style="top:36%">18</span><span class="big-year">the years ahead</span><span class="paper-year" style="bottom:15px">80</span></div>
 <div class="art-past">18<small>YEARS ALREADY LIVED</small></div>
 <div class="art-open">NOT YET WRITTEN<b>Your next page.</b></div></div>
 </section>`;
}
function agePage(){
 const error=ageError(state);
 return `${progress()}<div class="two-col age-layout"><section class="primary">
 <div class="page-heading"><span class="eyebrow">01 / THE FIRST TEAR</span><h2>First, the past.</h2>${hint('Choose an age and an end age for this game. Then tear the grey piece.','第 1 步｜撕下过去。用默认的 18 岁和 80 岁就能玩。灰纸表示已经过完的时间，撕下它后，留下的纸才是接下来要安排的时间。')}</div>
 <div class="age-fields"><label for="age">I am<span class="cn">我现在的年龄</span><input id="age" inputmode="numeric" type="number" min="1" max="110" step="1" value="${state.age}"></label>
 <label for="end-age">Imagine a life to age<span class="cn">假设活到多少岁</span><input id="end-age" inputmode="numeric" type="number" min="${state.age+1}" max="120" step="1" value="${state.endAge}"></label></div>
 <div id="age-error" class="error" role="status">${ageMessage(error)}</div>
 <div id="age-paper">${agePaper()}</div>
 <div class="actions"><button class="button secondary classroom-button" id="tear-past" ${error||state.pastTorn?'disabled':''}>${state.pastTorn?'Past torn off ✓':'Tear the past ↓'}${cn(state.pastTorn?'已撕下过去':'撕掉过去')}</button><button class="button classroom-button" id="age-next" ${error||!state.pastTorn?'disabled':''}>Build my day →${cn('下一步：安排一天')}</button></div>
 </section><aside class="panel sidebar"><span class="eyebrow">A NEW PIECE</span><h3>Still ahead</h3><strong class="huge" id="years-ahead">${error?'—':state.endAge-state.age}<small style="font:14px var(--sans);letter-spacing:0"> years</small></strong>
 ${hint('This is your chosen time horizon.<br>Your real life can be different.','这是游戏设定，真实人生可能不同。','small side-line')}
 ${hint('Every piece is part of your life.<br>Not all planned time is “lost”.','睡眠、陪伴与健康也是有价值的人生。','plain-note')}</aside></div>`;
}
function agePaper(){
 const valid=!ageError(state),ratio=valid?state.age/state.endAge*100:25;
 return `<div class="paper-rack"><div class="rack-ticks"><span>Birth · 0</span><span>Age ${valid?state.endAge:'?'}</span></div><div class="life-strip" style="--tear-edge:${ratio}%">
 <div class="ghost-paper"></div>${state.pastTorn?`<span class="already-lived">already lived</span>`:`<div class="paper-piece past-piece" id="past-piece" style="left:0;width:${ratio}%" aria-hidden="true"><strong>${valid?state.age:'?'}</strong><small>YEARS<br>ALREADY LIVED</small></div>`}
 <div class="paper-piece future-piece" style="left:${ratio+.5}%;width:${99.5-ratio}%"><strong>${valid?state.endAge-state.age:'?'} years</strong><small>THE YEARS AHEAD</small></div></div>
 <p class="pull-hint">${state.pastTorn?'The past is gone. What will you do next?':'Pull the grey piece down ↓'}${cn(state.pastTorn?`纸条上，过去的 ${state.age} 年已经撕下。接下来，试着安排未来的一天。`:'把灰色纸片向下拉，或点击下方「撕掉过去」。')}</p></div>`;
}
function ribbonMarkup(includeDelays=true){
 const r=calculate(state);
 const parts=CATEGORIES.filter(c=>state.budget[c.id]>0).map(c=>({name:c.name,hours:state.budget[c.id],color:c.color}));
 if(includeDelays&&r.focusHours+r.decisionHours>0)parts.push({name:'Small delays',hours:r.focusHours+r.decisionHours,color:'#d37c60'});
 const sum=parts.reduce((a,p)=>a+p.hours,0),den=Math.max(24,sum);
 return `<div class="ribbon" role="img" aria-label="${esc('Your day: '+hoursText(sum)+' planned, '+hoursText(Math.max(0,24-sum))+' open.')}">${parts.map(p=>`<span style="width:${p.hours/den*100}%;background:${p.color}" title="${esc(p.name+': '+hoursText(p.hours))}"></span>`).join('')}${sum<24?`<span class="free" style="width:${(24-sum)/24*100}%" title="Open time"></span>`:''}</div><div class="ribbon-axis"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>`;
}
function liveImpact(includeDelays=false){
 if(!dayAnchor)dayAnchor=snapshot();
 const r=calculate(state),ref=calculate({...state,...dayAnchor});
 const free=Math.max(0,24-(includeDelays?r.usedHours:r.baseHours)),old=Math.max(0,24-(includeDelays?ref.usedHours:ref.baseHours));
 const delta=free-old,scale=Math.max(1,free,old),tooFull=(includeDelays?r.usedHours:r.baseHours)>24;
 return `<div class="live-future"><span class="eyebrow">YOUR DAILY CHANGE / 每天改变一点</span><div class="mini-open-row"><span>Before</span><div><i style="width:${old/scale*100}%"></i></div><b>${hoursText(old)}</b></div><div class="mini-open-row"><span>Now</span><div><i style="width:${free/scale*100}%;background:${delta<0?'#c48468':'#548c75'}"></i></div><b>${hoursText(free)}</b></div><small>Open time only · same scale.</small><p class="${delta<0?'cost':'gain'}">${tooFull?'Make the day fit first.':Math.abs(delta)<1e-8?'Move a slider. Watch the future change.':`<b>${delta>0?'+':'−'}${hoursText(Math.abs(delta))} / day</b><br>${delta>0?'+':'−'}${fixed(Math.abs(delta)*365/24,1)} full days / year<br>${delta>0?'+':'−'}${fixed(Math.abs(delta)*r.remainingYears/24,2)} years of time ahead`}</p><span class="cn">与刚进入本页时对比；所有“年”按24小时整天折算。</span></div>`;
}
function futurePill(includeDelays=false){
 const r=calculate(state),ref=calculate({...state,...(dayAnchor||snapshot())}),used=includeDelays?r.usedHours:r.baseHours,oldUsed=includeDelays?ref.usedHours:ref.baseHours,delta=oldUsed-used;
 return `<div class="mobile-live-impact" id="mobile-live-impact"><div><span>Open each day</span>${cn(includeDelays?'计入额外耗时后剩余':'暂余 · 未计额外耗时')}<b>${used>24?'Too full':hoursText(24-used)}</b></div><div><span>${Math.abs(delta)>1e-8?'Your change → each year':'Move a slider. See your future.'}</span><b>${used>24?'Change your day':Math.abs(delta)>1e-8?(delta>0?'+':'−')+fixed(Math.abs(delta)*365/24,1)+' full days':'Daily choices add up.'}</b></div></div>`;
}
function labBanner(){
 return `<section class="lab-invite"><div><span class="eyebrow">NEW / THE TIME MACHINE</span><h3>Make the years move.</h3><p>See a small daily choice grow into a pile of time.<span class="cn">让同样的一天不断重复，亲眼看纸片和活动次数累积起来。</span></p></div><div class="invite-papers" aria-hidden="true"><i></i><i></i><i></i><b>30m<br><small>every day</small></b></div><button class="button accent" data-open-lab>Watch a small change →</button></section>`;
}
function openTimeLab(){
 labOrigin=state.view==='result'?'result':'welcome';
 const source=calculate(state).valid?state:defaultState();
 labSource={...source,budget:{...source.budget}};navigate('lab');
}
function labPage(){return '<div id="time-lab"></div>';}
function daySidebar(includeDelays=false){
 const r=calculate(state),used=includeDelays?r.usedHours:r.baseHours,free=Math.max(0,24-used);
 return `<span class="eyebrow">ONE AVERAGE DAY</span><h3>24 hours. That’s it.</h3><div id="live-ribbon">${ribbonMarkup(includeDelays)}</div>
 <div class="side-line budget-total"><span>Planned<span class="cn">已安排</span></span><b id="planned-total">${hoursText(used)}</b></div>
 <div class="side-line budget-total"><span>Still open${cn(includeDelays?'计入额外耗时后剩余':'暂余 · 未计额外耗时')}</span><b id="open-total" class="${used>24?'over':'good'}">${used>24?'Too full':hoursText(free)}</b></div>
 <p id="budget-warning" class="error" aria-live="polite">${used>24?budgetWarning(used):''}</p>
 <div id="live-future">${liveImpact(includeDelays)}</div>
 ${hint('Use an average day, including days off.','请按一周平均每天估计，包括休息日。','small side-line')}
 ${hint('Example: 7h of class × 5 days ÷ 7 ≈ 5h a day.','例如：每周上课5天，每天7小时，平均约5小时/天。','plain-note')}
 <p class="small">Count each minute once.<span class="cn">同一分钟只计一次：陪家人时刷手机，不要两边重复算。</span></p>`;
}
function budgetWarning(used){
 const extra=used-24;
 return `Over by ${hoursText(extra)}. Change your day.${cn(`超过了 24 小时，请减少 ${zhHours(extra)}，才能继续。`)}`;
}
function budgetContext(r,includeDelays){
 if(!includeDelays){
  if(r.baseHours>24) return '目前超过了 24 小时。调低一两项，给下一步留出余量。';
  if(24-r.baseHours<1e-8) return '目前正好 24 小时。可以继续，但下一步只要加上额外耗时，就需要回来调低一两项。';
  return `日常安排用了 ${zhHours(r.baseHours)}，暂时剩 ${zhHours(24-r.baseHours)}。可以进入第 3 步，看看额外耗时会占掉多少。`;
 }
 const extra=r.focusHours+r.decisionHours;
 const totals=`上一步的日常安排 ${zhHours(r.baseHours)} ＋ 这一步的额外耗时 ${zhHours(extra)}`;
 return r.valid
  ? `${totals}。最后还可自己安排 ${zhHours(r.freeHours)}／天。`
  : `${totals}，超过了 24 小时。请减少重复计入的时间，或返回上一步调整。`;
}
function budgetRow(c){
 return `<div class="budget-row" data-row="${c.id}"><div class="budget-label"><span class="category-icon" style="background:${c.color}33">${icon(c.icon)}</span><label for="num-${c.id}">${c.name}<span class="cn">${c.cn}</span></label></div>
 <div><div class="amount"><button data-adjust="${c.id}" data-delta="-.25" aria-label="Less time for ${c.name}">−</button><input id="num-${c.id}" data-budget="${c.id}" type="number" min="0" max="16" step=".25" inputmode="decimal" value="${state.budget[c.id]}" aria-label="${c.name}, hours per day"><span>h</span><button data-adjust="${c.id}" data-delta=".25" aria-label="More time for ${c.name}">+</button></div>
 <input class="range" type="range" min="0" max="16" step=".25" value="${state.budget[c.id]}" data-budget="${c.id}" aria-label="Adjust ${c.name} hours"><small class="row-future" id="future-${c.id}">Repeat daily → ${fixed(state.budget[c.id]*(state.endAge-state.age)/24,2)} years of time</small></div></div>`;
}
function dayPage(){
 if(!dayAnchor)dayAnchor=snapshot();
 const r=calculate(state);
 return `${progress()}<div class="page-heading"><span class="eyebrow">02 / GIVE YOUR DAY A SHAPE</span><h2>Where does it go?</h2>${hint('Choose your hours on an average day. Leave room for the next step.','第 2 步｜安排平常的一天。先估计平常每天睡觉、上课、吃饭、通勤等各用多久。用滑块、数字框或 +／− 调整。')}</div>
 <aside class="classroom-note budget-instruction cn" lang="zh-CN"><strong>24 小时是上限，不用填满。</strong>
 <p>先填平时的日常用时。同一段时间只算一次。下一步会再估算分心、犹豫或等待多花的时间，所以可以先留一些空白。</p>
 <p>比如这一步先排了 22 小时，下一步又加 30 分钟，最后就还剩 1 小时 30 分钟可以自己安排。</p>
 <p id="budget-context" class="budget-context" role="status">${budgetContext(r,false)}</p></aside>
 <div class="two-col"><section class="primary"><div class="day-top"><div class="preset-row"><span>Start with:</span><button class="chip" data-preset="school">A sample day${cn('用示例')}</button><button class="chip" data-preset="blank">A blank day${cn('从零填写')}</button></div>
 ${hint('Start with the sample, or fill in your own day.','想快一点就点「用示例」，再改一两项。没有的活动可以填 0。','help')}</div>
 ${CATEGORIES.map(budgetRow).join('')}
 ${hint('Care & recovery means extra awake time for visits, treatment or rest. It does not shorten your chosen life.','就医休养只计额外清醒时间，不重复算睡眠，也不会自动改变假设寿命。','plain-note')}
 <p class="classroom-note cn" lang="zh-CN">合计不超过 24 小时，就可以点下一步。额外耗时会从现在剩下的时间里扣除。</p>
 <div class="actions"><button class="button ghost classroom-button" data-view="age">← Your age${cn('回到年龄设定')}</button><button class="button classroom-button" id="day-next" ${r.baseHours>24?'disabled':''}>Small delays →${cn('下一步：算上额外耗时')}</button></div>
 </section><aside class="panel sidebar" id="day-sidebar">${daySidebar(false)}</aside></div>${futurePill(false)}`;
}
function delaysPage(){
 const r=calculate(state);
 return `${progress()}<div class="page-heading"><span class="eyebrow">03 / THE LITTLE IN-BETWEEN MOMENTS</span><h2>Small delays add up.</h2>${hint('Add only the extra time you have not counted before.','第 3 步｜算上额外耗时。上一步排的是日常活动，现在想想有哪些分钟原本没算进去。加完这两项，才知道一天真正还剩多少。')}</div>
 <aside class="classroom-note budget-instruction cn" lang="zh-CN"><strong>你的时间还剩多少？</strong><p id="budget-context" class="budget-context" role="status">${budgetContext(r,true)}</p></aside>
 <div class="two-col"><section class="primary"><h3>When I do flexible tasks…${cn('① 做事时分心，多花了多久？')}</h3><p class="help cn" lang="zh-CN">比如写课后作业时总停下来做别的事，作业就要更久才做完。按你的情况选一档。</p><div class="focus-options" role="group" aria-label="Focus choice">${FOCUS.map((f,i)=>`<button class="focus-card ${i===state.focus?'selected':''}" data-focus="${i}" aria-pressed="${i===state.focus}"><span class="dot"></span><div><b>${f.name}</b>${cn(f.cn)}</div><small>${f.help}</small></button>`).join('')}</div>
 <div class="delay-rule">Game rule: stops add 0%, 15% or 30% to extra study / work and chores only.${cn('游戏里，专注完成不加时，偶尔分心加 15%，经常分心加 30%。只影响课外学习、额外工作和家务，固定上课时间照原来算。')}</div>
 <p class="plain-note" id="focus-extra">Extra time: <b>${hoursText(r.focusHours)}</b> a day.${cn(`这一档每天多花 ${zhHours(r.focusHours)}。`)}</p>
 <div class="section-gap"><h3>Time spent choosing or waiting${cn('② 犹豫或等待，多花了多久？')}</h3>${hint('What to wear? What to watch? Which task first?','比如挑视频看了很久才决定，或在两件作业之间犹豫迟迟没开始。用滑块填每天额外花的分钟数。','help')}
 <label for="decision-range" class="decision-output"><span id="decision-value">${state.decide}</span> <small>min / day</small></label>
 <input class="range" id="decision-range" type="range" min="0" max="120" step="5" value="${state.decide}" aria-label="Extra choosing or waiting minutes per day">
 ${hint('If you already counted these minutes in phone time or other tasks, do not add them again.','比如等车已算在通勤里，或挑视频已算在刷手机里，这里就不用再加。','plain-note')}</div>
 <p class="classroom-note cn" lang="zh-CN">如果上一步已经算进了这些时间，或者确实没有额外耗时，可以选「专注完成」，把上面的滑块拉到 0。</p>
 <div class="actions"><button class="button ghost classroom-button" data-view="day">← My day${cn('回到一天安排')}</button><button class="button accent classroom-button" id="delays-next" ${!r.valid?'disabled':''}>Time to tear ↓${cn('下一步：逐段撕纸')}</button></div>
 </section><aside class="panel sidebar" id="day-sidebar">${daySidebar(true)}</aside></div>${futurePill(true)}`;
}
function tearPage(){
 const r=calculate(state),groups=tearGroups(state);
 state.tearIndex=Math.min(state.tearIndex,groups.length);
 const ix=state.tearIndex,g=groups[ix],last=groups[ix-1],past=groups.slice(0,ix).reduce((a,c)=>a+c.hours,0);
 const totalLeft=Math.max(0,24-past),piece=g?g.hours:0,nextLeft=Math.max(0,totalLeft-piece);
 const nextStart=(past+piece)/24*100,remainingWidth=nextLeft/24*100;
 return `${progress()}<section class="tear-main"><div class="page-heading"><span class="eyebrow">04 / A LITTLE EACH DAY, A LOT OVER TIME</span><h2>${g?'Now, tear the time.':'This piece is still yours.'}</h2>${hint(g?'Set time aside for each part of your life. Pull the coloured piece down, or use the button.':'This is the time you have not planned yet. What will you choose? ',
 g?'第 4 步｜逐段撕纸。每种颜色代表一类用时。下拉彩纸或点「撕下这一段」，比较「每天用多少」和「一年累积多少」。':r.freeHours>0?'绿纸是扣掉日常活动和额外耗时后剩下的时间。点「看结果，想一想」，说说你想怎样用它。':'一天的 24 小时都排满了。点「看结果，想一想」，选一段你愿意调整的时间。')}</div>
 <p class="tear-counter">${g?'PIECE '+(ix+1)+' OF '+groups.length:'ALL PIECES COUNTED'}${cn(g?`第 ${ix+1}／${groups.length} 段`:'已完成撕纸')}</p>
 ${g?`<div class="tear-tag"><i style="background:${g.color}"></i>${g.name}<span class="cn" style="margin:0">${g.cn}</span></div>`:`<div class="tear-tag"><i style="background:#6a9c86"></i>Open time · ${hoursText(r.freeHours)} / day</div>`}
 <div class="life-strip" style="--tear-edge:${nextStart}%"><div class="ghost-paper"></div>${g?`<div class="paper-piece cut-piece" id="cut-piece" style="left:${past/24*100}%;width:${piece/24*100}%;background-color:${g.color}88" aria-hidden="true">${piece/24>0.17?'<span class="tear-down">↓</span>':''}</div>`:''}
 ${nextLeft>0?`<div class="paper-piece" style="left:${nextStart}%;width:${remainingWidth}%;background-color:${g?'#fffdf6':'#d7e7d7'}" aria-hidden="true">${remainingWidth>22?`<strong>${fixed(r.remainingYears*nextLeft/24,1)}</strong><small>YEARS OF TIME</small>`:''}</div>`:''}</div>
 <div class="paper-feedback cn" lang="zh-CN"><span>${g?(last?`刚撕下 <b>${last.cn}</b>，每天 ${zhHours(last.hours)}`:'从一张每天 24 小时的纸开始'):'纸条已经分配完毕'}</span><span>${g?'撕下这一段后，待分配':'最后可自己安排'} <b>${zhHours(nextLeft)}／天</b></span></div>
 ${g?`<p class="tear-info"><b>${hoursText(g.hours)} a day</b> → about <b>${fixed(r.remainingYears*g.hours/24,2)} years</b> of time.<br><span class="help">${g.line}</span></p>`:`<p class="tear-info"><b>${hoursText(r.freeHours)} each day</b> · about <b>${fixed(r.freeYears,2)} years</b> put together.<span class="cn">按全天24小时折算的时间，不是增加的寿命。</span></p>`}
 ${g?`<div class="tear-repeat"><div><small>1 day${cn('每天')}</small><b>${hoursText(g.hours)}</b></div><span>→</span><div><small>1 year${cn('累积一年')}</small><b>${fixed(g.hours*365/24,1)} full days</b></div><span>→</span><div><small>${r.remainingYears} years${cn('累积至设定年龄')}</small><b>${fixed(r.remainingYears*g.hours/24,2)} full years</b></div></div><p class="tear-repeat-note">The same day, again and again.${cn(`每天 ${zhHours(g.hours)}，一年就约有 ${fixed(g.hours*365/24,1)} 个整天花在这件事上。`)}</p>`:''}
 <div class="button-row">${g?`<button class="button accent classroom-button" id="tear-next">Tear this piece ↓${cn('撕下这一段')}</button><button class="button ghost classroom-button" id="tear-all">Show all at once${cn('直接看剩余时间')}</button>`:`<button class="button accent classroom-button" id="see-result">See my time →${cn('看结果，想一想')}</button>`}</div>
 <p class="tear-guide">${g?'Sleep, health and people are part of life, not wasted time.':'The smallest piece can hold something important.'}${cn(g?'睡眠、运动和陪伴都值得留出时间。想一想，哪一段最值得保留？':'纸条再短，也能装下一件你重视的小事。')}</p>
 <div class="tear-mini">${groups.slice(0,ix).map(t=>`<span style="border-color:${t.color}">${t.name} · ${hoursText(t.hours)}</span>`).join('')}</div>
 <button class="text-button" data-view="day">Change my day</button></section>`;
}
function resultPage(){
 const r=calculate(state),groups=tearGroups(state);
 if(!state.baseline)state.baseline=snapshot();
 const base=calculate({...state,...state.baseline}),gain=Math.max(0,r.freeHours-base.freeHours);
 return `${progress()}<section><div class="result-top"><div><span class="eyebrow">05 / YOUR NEXT PAGE</span><h2>Your time. Your choice.</h2><p style="margin-top:15px">Age ${state.age} now · imagine age ${state.endAge}<span class="cn">现在${state.age}岁，游戏假设到${state.endAge}岁。</span></p></div><div class="button-row"><button class="button secondary classroom-button" data-view="day">Edit my day${cn('修改一天安排')}</button><button class="button classroom-button" id="copy-result">Copy my time card${cn('复制我的时间卡')}</button></div></div>
 <p class="classroom-note cn" lang="zh-CN"><strong>第 5 步｜看结果，和同桌聊一聊。</strong> 扣掉所有用时后，每天还有 ${zhHours(r.freeHours)} 可以自己安排。看看哪一段最让你意外，再想一件你愿意每天花 15 分钟去做的事。</p>
 ${labBanner()}
 <div class="result-hero"><div><span class="eyebrow">OPEN TIME / STILL UNPLANNED</span><div class="result-number" id="result-daily">${hoursText(r.freeHours)}</div><h2>each day, for your own plans.</h2>${hint('Not empty time. Time you can choose.','不是空白的人生，而是尚未安排、可自己选择的时间。','plain-note')}</div>
 <div><span class="eyebrow">YOUR WHOLE PAPER STRIP</span><div class="result-strip" role="img" aria-label="Past, scheduled time and open time"><span style="width:${state.age/state.endAge*100}%;background:#d6cec0"></span>${groups.map(g=>`<span style="width:${(state.endAge-state.age)/state.endAge*g.hours/24*100}%;background:${g.color}" title="${esc(g.name)}"></span>`).join('')}<span style="width:${r.remainingYears/state.endAge*r.freeHours/24*100}%;background:#6a9c86" title="Open time"></span></div>
 <p class="result-legend">Past: ${state.age} years · Planned: ${fixed(r.scheduledYears,2)} years · Open: ${fixed(r.freeYears,2)} years<span class="cn">过去／未来已安排／未来未安排：均为24小时整天折算。</span></p>
 ${hint('If this average day stayed the same for the years ahead.','是假设日常模式一直不变的粗略估算；人生安排会变化。','plain-note')}</div></div>
 <section class="reading-bridge" aria-labelledby="reading-title"><span class="eyebrow">THINK, PAIR, SHARE ${cn('先想，再和同桌分享')}</span>
 <h3 id="reading-title">It is how we spend our time that makes the difference.</h3>
 ${hint('What surprised you most when you tore the paper?','哪一段撕下来时最让你意外？说说原因。')}
 ${hint('If you could set aside 15 minutes a day, what would you do with them?','如果每天能腾出 15 分钟，你最想留给什么？')}
 ${hint('Think about the same questions as you read.','带着这两个问题读课文，看看作者怎样看待拖延和认真投入的时间。','reading-next')}</section>
 <div class="result-stats"><div class="result-stat"><strong>${r.remainingYears}</strong><small>imagined years ahead<span class="cn">游戏设定剩余年数</span></small></div><div class="result-stat"><strong id="result-years">${fixed(r.freeYears,2)}</strong><small>years of open time<span class="cn">自由时间折合年数（24h/天）</span></small></div><div class="result-stat"><strong>${fixed(r.freeTotalHours,0)}</strong><small>open hours in all<span class="cn">累计尚未安排的小时</span></small></div></div>
 <div class="result-bottom"><section class="breakdown"><h3>Where your time goes<span class="cn">每天的选择，累积成一生</span></h3><table><thead><tr><th scope="col">Activity</th><th scope="col">Each day</th><th scope="col">Years of time</th></tr></thead><tbody>${groups.map(g=>`<tr><td><i style="background:${g.color}"></i>${g.name}</td><td>${hoursText(g.hours)}</td><td>${fixed(r.remainingYears*g.hours/24,2)}</td></tr>`).join('')}<tr class="open-row"><td><i style="background:#6a9c86"></i>Still open</td><td>${hoursText(r.freeHours)}</td><td>${fixed(r.freeYears,2)}</td></tr></tbody></table></section>
 <section><div class="experiment"><span class="eyebrow">TRY ONE SMALL CHANGE</span><h3>What if…?</h3>${hint('Change one choice. See what it opens up.','试着改一个选择，看看能多出多少时间。')}
 <button data-change="phone" ${state.budget.phone<.5?'disabled':''}>30 min less on my phone<span class="cn">每天少刷30分钟手机</span></button>
 <button data-change="decide" ${state.decide<10?'disabled':''}>10 min less choosing / waiting<span class="cn">每天少10分钟犹豫或等待</span></button>
 <button data-change="focus" ${state.focus===0?'disabled':''}>One step more focused<span class="cn">让分心程度降低一档</span></button>
 <div class="saving" aria-live="polite">${gain>1e-8?'+'+Math.round(gain*60)+' min / day':''}</div>
 ${gain>1e-8?`<p style="margin:0 0 10px">That is ${fixed(gain*365,0)} more hours each year.</p><button class="text-button" id="undo-change">Back to my first plan</button>`:''}
 </div><div class="reflection"><label for="reflection">What will you do with your time?<span class="cn">写一个明天就能开始的小计划</span></label><p class="starter">I’ll spend ___ minutes a day on ___ because ___.${cn('我想每天留出 ___ 分钟用来 ___，因为 ___。例如，复习实训步骤、练几句英语，或给家里打个电话。')}</p><textarea id="reflection" maxlength="1000" placeholder="Write a small plan…" aria-label="Your reflection / 我的小计划">${esc(state.reflection)}</textarea></div></section></div>
 <details class="math-note"><summary>How do the numbers work? <span class="cn" style="display:inline">计算方式</span></summary><p>Years ahead = end age − your age. Open time each day = 24h − your daily plan − extra delays.<br>Total open hours = years ahead × 365 × open hours each day. Years of time = total open hours ÷ 24 ÷ 365.<br>One “year of time” means 365 full 24-hour days. It does not add years to your life. The game repeats your chosen average day; it does not model holidays, retirement or changing needs.<span class="cn">年数按365天、每天24小时折算。假设日常安排不变，不模拟假期、退休与不同人生阶段，也不预测寿命。照护时间不改变寿命设定。所有输入仅保存在本机浏览器中。</span></p></details>
 <div class="actions"><button class="button ghost" id="replay">Tear my strip again</button><button class="button secondary" id="print-result">Print / save my card</button></div></section>`;
}
function render(){
 if(labCleanup){labCleanup();labCleanup=null;}
 applyTips();document.body.classList.toggle('budget-mode',['day','delays'].includes(state.view));
 app.innerHTML=({welcome,age:agePage,day:dayPage,delays:delaysPage,tear:tearPage,result:resultPage,lab:labPage}[state.view]||welcome)();
 if(state.view==='lab')labCleanup=mountTimeLab(document.querySelector('#time-lab'),labSource||(calculate(state).valid?state:defaultState()),{fromWelcome:labOrigin==='welcome',onBack:()=>navigate(labOrigin),onOwnDay:()=>navigate('age'),onApply:next=>{if(!state.baseline)state.baseline=snapshot();state.budget={...next.budget};state.focus=next.focus;state.decide=next.decide;navigate('result');}});
 if(state.view==='age'){wireAge();wireDrag(document.querySelector('#past-piece'),tearPast);}
 if(state.view==='tear')wireDrag(document.querySelector('#cut-piece'),tearNext);
 persist();
}
function wireAge(){
 for(const [id,key] of [['age','age'],['end-age','endAge']]){
 document.getElementById(id).addEventListener('input',e=>{
 state[key]=e.target.value===''?NaN:Number(e.target.value);state.pastTorn=false;
 const err=ageError(state);document.getElementById('age-error').textContent=ageMessage(err);
 document.getElementById('years-ahead').innerHTML=(err?'—':state.endAge-state.age)+'<small style="font:14px var(--sans);letter-spacing:0"> years</small>';
 document.getElementById('age-paper').innerHTML=agePaper();
 document.getElementById('tear-past').disabled=!!err;document.getElementById('tear-past').innerHTML='Tear the past ↓'+cn('撕掉过去');document.getElementById('age-next').disabled=true;
 wireDrag(document.getElementById('past-piece'),tearPast);persist();
 });
 }
}
function animationWait(){return matchMedia('(prefers-reduced-motion: reduce)').matches?15:650;}
async function animateTear(id){
 const piece=document.getElementById(id);
 if(piece){
  piece.style.transform='';
  piece.classList.add('torn');
  piece.closest('.life-strip').classList.add('is-tearing');
 }
 playTearSound();
 await new Promise(resolve=>setTimeout(resolve,animationWait()));
}
async function tearPast(){
 if(ripping||state.pastTorn||ageError(state))return;
 const button=document.getElementById('tear-past');
 const hadFocus=button===document.activeElement;
 ripping=true;
 button.disabled=true;
 document.getElementById('age').disabled=true;
 document.getElementById('end-age').disabled=true;
 await animateTear('past-piece');
 state.pastTorn=true;ripping=false;render();
 if(hadFocus)document.getElementById('age-next').focus({preventScroll:true});
}
async function tearNext(){
 if(ripping||state.view!=='tear')return;
 const groups=tearGroups(state);if(state.tearIndex>=groups.length)return;
 const button=document.getElementById('tear-next');
 const hadFocus=button===document.activeElement;
 ripping=true;
 button.disabled=true;
 await animateTear('cut-piece');
 state.tearIndex++;ripping=false;render();
 if(hadFocus)document.querySelector('#tear-next, #see-result').focus({preventScroll:true});
}
function wireDrag(node,onTear){
 if(!node)return;
 let y=null,dy=0;
 node.addEventListener('pointerdown',e=>{if(ripping||e.button!==0)return;y=e.clientY;dy=0;node.setPointerCapture(e.pointerId);});
 node.addEventListener('pointermove',e=>{if(y===null)return;dy=Math.max(0,e.clientY-y);node.style.transform=`translateY(${Math.min(dy,95)}px) rotate(${-Math.min(dy/10,9)}deg)`;});
 function end(){if(y===null)return;y=null;if(dy>45)onTear();else node.style.transform='';}
 node.addEventListener('pointerup',end);node.addEventListener('pointercancel',()=>{y=null;node.style.transform='';});
}
function updateLive(includeDelays){
 const r=calculate(state),used=includeDelays?r.usedHours:r.baseHours;
 const ribbon=document.querySelector('#live-ribbon');if(ribbon)ribbon.innerHTML=ribbonMarkup(includeDelays);
 const planned=document.querySelector('#planned-total');if(planned)planned.textContent=hoursText(used);
 const open=document.querySelector('#open-total');if(open){open.textContent=used>24?'Too full':hoursText(24-used);open.className=used>24?'over':'good';}
 const warning=document.querySelector('#budget-warning');if(warning)warning.innerHTML=used>24?budgetWarning(used):'';
 const context=document.querySelector('#budget-context');if(context)context.textContent=budgetContext(r,includeDelays);
 const next=document.querySelector(includeDelays?'#delays-next':'#day-next');if(next)next.disabled=includeDelays?!r.valid:used>24+1e-8;
 const liveFuture=document.querySelector('#live-future');if(liveFuture)liveFuture.innerHTML=liveImpact(includeDelays);
 const pill=document.querySelector('#mobile-live-impact');if(pill)pill.outerHTML=futurePill(includeDelays);
 for(const c of CATEGORIES){const node=document.querySelector('#future-'+c.id);if(node)node.textContent='Repeat daily → '+fixed(state.budget[c.id]*r.remainingYears/24,2)+' years of time';}
 persist();
}
app.addEventListener('input',e=>{
 if(e.target.dataset.budget){
 const id=e.target.dataset.budget;
 if(e.target.value==='')return;
 const v=Number(e.target.value);if(!Number.isFinite(v))return;
 state.budget[id]=Math.max(0,Math.min(16,v));state.baseline=null;
 document.querySelectorAll(`[data-budget="${id}"]`).forEach(input=>{if(input!==e.target)input.value=state.budget[id];});
 updateLive(false);
 }
 if(e.target.id==='decision-range'){state.decide=Number(e.target.value);state.baseline=null;document.querySelector('#decision-value').textContent=state.decide;updateLive(true);}
 if(e.target.id==='reflection'){state.reflection=e.target.value;persist();}
});
app.addEventListener('change',e=>{
 if(e.target.dataset.budget){const id=e.target.dataset.budget;e.target.value=state.budget[id];}
});
app.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||b.disabled||ripping)return;
 if(b.hasAttribute('data-open-lab')){openTimeLab();return;}
 if(b.dataset.view){navigate(b.dataset.view);return;}
 if(b.dataset.action==='start'){navigate('age');return;}
 if(b.id==='tear-past'){tearPast();return;}
 if(b.id==='age-next'){if(!ageError(state)&&state.pastTorn)navigate('day');return;}
 if(b.dataset.preset){state.budget=b.dataset.preset==='blank'?Object.fromEntries(CATEGORIES.map(c=>[c.id,0])):defaultState().budget;state.baseline=null;persist();render();showToast(b.dataset.preset==='blank'?'A blank day. Make it yours.':'Sample loaded. Change it to fit your day.');return;}
 if(b.dataset.adjust){
 const id=b.dataset.adjust;state.budget[id]=Math.max(0,Math.min(16,Math.round((state.budget[id]+Number(b.dataset.delta))*100)/100));state.baseline=null;
 document.querySelectorAll(`[data-budget="${id}"]`).forEach(input=>input.value=state.budget[id]);updateLive(false);return;
 }
 if(b.id==='day-next'){if(calculate(state).baseHours<=24)navigate('delays');return;}
 if(b.dataset.focus!==undefined){state.focus=Number(b.dataset.focus);state.baseline=null;render();return;}
 if(b.id==='delays-next'){if(calculate(state).valid){state.tearIndex=0;state.baseline=null;navigate('tear');}return;}
 if(b.id==='tear-next'){tearNext();return;}
 if(b.id==='tear-all'){state.tearIndex=tearGroups(state).length;render();return;}
 if(b.id==='see-result'){state.baseline=snapshot();navigate('result');return;}
 if(b.dataset.change){
 if(!state.baseline)state.baseline=snapshot();
 if(b.dataset.change==='phone')state.budget.phone=Math.max(0,state.budget.phone-.5);
 if(b.dataset.change==='decide')state.decide=Math.max(0,state.decide-10);
 if(b.dataset.change==='focus')state.focus=Math.max(0,state.focus-1);
 persist();render();showToast('One small change. More room in your day.');return;
 }
 if(b.id==='undo-change'){if(state.baseline){state.budget={...state.baseline.budget};state.focus=state.baseline.focus;state.decide=state.baseline.decide;}render();return;}
 if(b.id==='replay'){state.tearIndex=0;navigate('tear');return;}
 if(b.id==='print-result'){window.print();return;}
 if(b.id==='copy-result'){
 const r=calculate(state);
 const text=`MY PAPER DAYS\nAge ${state.age} → imagine age ${state.endAge}\n${r.remainingYears} imagined years ahead\nOpen time: ${hoursText(r.freeHours)} a day\nAbout ${fixed(r.freeTotalHours,0)} hours, or ${fixed(r.freeYears,2)} full-day years in all.\n${state.reflection?'\nMy small plan: '+state.reflection+'\n':''}\nA game estimate if this average day stayed the same. A year = 365 days × 24 hours. Not a life prediction.`;
 try{await navigator.clipboard.writeText(text);showToast('Time card copied.');}catch{showToast('Copy is not available here. Use Print / save my card.');}
 }
});
document.querySelector('#tips-button').addEventListener('click',()=>{state.tips=!state.tips;applyTips();persist();});
soundButton.addEventListener('click',toggleSound);
document.querySelector('#home-link').addEventListener('click',e=>{e.preventDefault();navigate('welcome');});
document.querySelector('#reset-button').addEventListener('click',()=>{if(!ripping)document.querySelector('#reset-dialog').showModal();});
document.querySelector('#confirm-reset').addEventListener('click',()=>{const tips=state.tips;state=defaultState();state.tips=tips;dayAnchor=null;labSource=null;persist();render();window.scrollTo({top:0,behavior:'instant'});});
render();

