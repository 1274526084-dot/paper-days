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
const label=(en,zh)=>`<span class="en-label">${en}</span>${cn(zh)}`;
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
 return `<nav class="progress" aria-label="Game progress / 游戏进度">${names.map((n,i)=>`<span class="step ${i===ix?'active':i<ix?'done':''}" ${i===ix?'aria-current="step"':''}><b>${i+1}</b><span>${label(n,labels[i])}</span></span>`).join('')}</nav>`;
}
function stepHeading(en,zh,instruction,zhInstruction){
 return `<div class="page-heading compact-heading"><h2>${label(en,zh)}</h2><p>${label(instruction,zhInstruction)}</p></div>`;
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
 return `<section class="intro game-cover">
 <div class="cover-copy"><span class="eyebrow">PAPER DAYS <i aria-hidden="true"></i> ${label('CLASSROOM GAME','英语课堂导入')}</span>
 <h1 class="welcome-title">${cn('时间撕纸游戏')}<span class="welcome-title-en">Your life on a strip of paper</span></h1>
 <p class="welcome-purpose">${label('Imagine your life on a strip of paper. Tear off the time you spend each day. What’s left for you to choose?','把一生想象成一条纸。撕去已经过完和安排好的时间，看看还有多少时间能留给自己。')}</p>
 <div class="button-row welcome-actions"><button class="button accent classroom-button" data-action="start">${label('Start the game','开始游戏')} <span aria-hidden="true">→</span></button></div>
 <details class="classroom-guide cn" lang="zh-CN"><summary>怎么玩 <span>共 5 步</span></summary>
 <ol><li><b>撕下过去。</b>用示例年龄，撕掉灰纸。</li>
 <li><b>安排一天。</b>估算日常用时，24 小时不用填满。</li>
 <li><b>加上额外耗时。</b>估算还没算过的分心、犹豫或等待。</li>
 <li><b>逐段撕纸。</b>看看每天用时累积一年有多少。</li>
 <li><b>看结果。</b>和同桌聊聊，你愿意把 15 分钟留给什么？</li></ol><button class="text-button" data-open-lab>看看每天改变一点 →</button></details>
 </div>
 <div class="cover-art" aria-hidden="true"><img src="./paper-cover.svg" width="560" height="330" alt=""><span>${label('ONE DAY. 24 HOURS.','每一天，都是 24 小时。')}</span></div>
 </section>`;
}
function agePage(){
 const error=ageError(state);
 return `${progress()}<div class="two-col age-layout"><section class="primary">
 ${stepHeading('First, the past.','撕下过去','Use the sample ages or enter your own. Tear off the grey piece.','可以用示例年龄。下拉灰纸，或点「撕掉过去」。')}
 <div class="age-fields"><label for="age">${label('I am','现在的年龄')}<input id="age" inputmode="numeric" type="number" min="1" max="110" step="1" value="${state.age}"></label>
 <label for="end-age">${label('Imagine a life to age','假设的年龄')}<input id="end-age" inputmode="numeric" type="number" min="${state.age+1}" max="120" step="1" value="${state.endAge}"></label></div>
 <div id="age-error" class="error" role="status">${ageMessage(error)}</div>
 <div id="age-paper">${agePaper()}</div>
 <div class="actions"><button class="button secondary classroom-button" id="tear-past" ${error||state.pastTorn?'disabled':''}>${label(state.pastTorn?'Past torn off ✓':'Tear the past ↓',state.pastTorn?'已撕下 ✓':'撕掉过去 ↓')}</button><button class="button classroom-button" id="age-next" ${error||!state.pastTorn?'disabled':''}>${label('Build my day →','安排一天 →')}</button></div>
 </section><aside class="panel sidebar age-summary"><h3>${label('Years ahead','纸条上还剩')}</h3><strong class="huge" id="years-ahead">${error?'—':state.endAge-state.age}<small>${label(' years',' 年')}</small></strong>
 <p class="small">${label('A classroom estimate.','年龄仅为游戏设定。')}</p></aside></div>`;
}
function agePaper(){
 const valid=!ageError(state),ratio=valid?state.age/state.endAge*100:25;
 return `<div class="paper-rack"><div class="rack-ticks"><span>Birth · 0</span><span>Age ${valid?state.endAge:'?'}</span></div><div class="life-strip" style="--tear-edge:${ratio}%">
 <div class="ghost-paper"></div>${state.pastTorn?`<span class="already-lived">already lived</span>`:`<div class="paper-piece past-piece" id="past-piece" style="left:0;width:${ratio}%" aria-hidden="true"><strong>${valid?state.age:'?'}</strong><small>YEARS<br>ALREADY LIVED</small></div>`}
 <div class="paper-piece future-piece" style="left:${ratio+.5}%;width:${99.5-ratio}%"><strong>${valid?state.endAge-state.age:'?'} years</strong><small>THE YEARS AHEAD</small></div></div>
 <p class="pull-hint">${state.pastTorn?label(`You tore off ${state.age} years.`,`已撕下过去的 ${state.age} 年。`):'&nbsp;'}</p></div>`;
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
 const r=calculate(state),used=includeDelays?r.usedHours:r.baseHours;
 return `<div class="mobile-live-impact" id="mobile-live-impact">${label(includeDelays?'Time you can choose':'Time left before delays',includeDelays?'可自己安排':'暂余 · 未计额外耗时')}<b>${used>24?label('Over 24h','超过 24 小时'):label(hoursText(24-used),zhHours(24-used))}</b></div>`;
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
 return `<h3>${label('Your 24 hours','我的一天')}</h3><div id="live-ribbon">${ribbonMarkup(includeDelays)}</div>
 <div class="side-line budget-total">${label('Used','已用')}<b id="planned-total">${hoursText(used)}</b></div>
 <div class="side-line budget-total">${label('Time left',includeDelays?'可自己安排':'暂余')}<b id="open-total" class="${used>24?'over':'good'}">${used>24?'—':hoursText(free)}</b></div>
 <p id="budget-warning" class="error" aria-live="polite">${used>24?budgetWarning(used):''}</p>
 <details class="quiet-details"><summary>${label('See time changes','看时间变化')}</summary><div id="live-future">${liveImpact(includeDelays)}</div></details>`;
}
function budgetWarning(used){
 const extra=used-24;
 return label(`Reduce your total by ${hoursText(extra)}.`,`超出 ${zhHours(extra)}，请调低后继续。`);
}
function budgetContext(r,includeDelays){
 if(!includeDelays){
  if(r.baseHours>24) return '已超过 24 小时，请调低一两项。';
  if(24-r.baseHours<1e-8) return '正好 24 小时。下一步若有额外耗时，可回来调整。';
  return '';
 }
 const extra=r.focusHours+r.decisionHours;
 return `额外耗时 ${zhHours(extra)} · ${r.valid?`每天可自己安排 ${zhHours(r.freeHours)}`:'已超过 24 小时，可返回调整'}`;
}
function budgetRow(c){
 const shortNames={people:'陪伴',phone:'休闲刷手机',care:'就医与休养',other:'其他'};
 return `<div class="budget-row" data-row="${c.id}"><div class="budget-label"><span class="category-icon" style="background:${c.color}33">${icon(c.icon)}</span><label for="num-${c.id}">${label(c.name,shortNames[c.id]||c.cn)}</label></div>
 <div><div class="amount"><button data-adjust="${c.id}" data-delta="-.25" aria-label="Less time for ${c.name}">−</button><input id="num-${c.id}" data-budget="${c.id}" type="number" min="0" max="16" step=".25" inputmode="decimal" value="${state.budget[c.id]}" aria-label="${c.name}, hours per day"><span>h</span><button data-adjust="${c.id}" data-delta=".25" aria-label="More time for ${c.name}">+</button></div>
 <input class="range" type="range" min="0" max="16" step=".25" value="${state.budget[c.id]}" data-budget="${c.id}" aria-label="Adjust ${c.name} hours"></div></div>`;
}
function dayPage(){
 if(!dayAnchor)dayAnchor=snapshot();
 const r=calculate(state);
 return `${progress()}${stepHeading('Plan an ordinary day','安排一天','Estimate your usual daily hours, or start with the sample.','估算平常每天的用时，也可以直接用示例。')}
 <aside class="budget-instruction"><strong>${label('You can leave time unfilled.','24 小时不用填满。')}</strong> ${label('The next step adds extra time for distractions or waiting.','下一步还会扣除分心、犹豫或等待的额外时间。')}
 <p id="budget-context" class="budget-context cn" lang="zh-CN" role="status">${budgetContext(r,false)}</p></aside>
 <div class="two-col"><section class="primary"><div class="preset-row"><button class="chip" data-preset="school">${label('Use sample','用示例')}</button><button class="chip" data-preset="blank">${label('Start from zero','从零填写')}</button></div>
 <div class="budget-items">${CATEGORIES.map(budgetRow).join('')}</div>
 <details class="quiet-details"><summary>${label('How to count your hours','用时怎么算？')}</summary><p>${label('Use an average day, including days off. Count each minute once. Care covers extra awake time for treatment or recovery.','按一周平均每天估算，同一段时间只算一次。就医休养只计额外的清醒时间。')}</p></details>
 <div class="actions"><button class="button ghost classroom-button" data-view="age">${label('← Back','← 上一步')}</button><button class="button classroom-button" id="day-next" ${r.baseHours>24?'disabled':''}>${label('Add extra time →','加上额外耗时 →')}</button></div>
 </section><aside class="panel sidebar" id="day-sidebar">${daySidebar(false)}</aside></div>${futurePill(false)}`;
}
function delaysPage(){
 const r=calculate(state);
 return `${progress()}${stepHeading('Add extra time','加上额外耗时','Count only the minutes not included in your daily plan.','只加上一步还没算过的时间。')}
 <p id="budget-context" class="delay-total cn" lang="zh-CN" role="status">${budgetContext(r,true)}</p>
 <div class="two-col"><section class="primary delay-form"><section class="panel"><h3>${label('1. Time lost to distractions','① 做事分心')}</h3><div class="focus-options" role="group" aria-label="Focus choice / 分心程度">${FOCUS.map((f,i)=>`<button class="focus-card ${i===state.focus?'selected':''}" data-focus="${i}" aria-pressed="${i===state.focus}"><b>${label(f.name,f.cn)}</b><small>+${Math.round(f.rate*100)}%</small></button>`).join('')}</div>
 <details class="quiet-details"><summary>${label('What does this affect?','这项影响什么？')}</summary><p>${label('Only extra study, extra work and chores. Leave it at 0% if you already counted interruptions.','只影响课外学习、额外工作和家务。上一步已经算过，就选「专注完成」。')}</p></details></section>
 <section class="panel"><h3>${label('2. Time spent choosing or waiting','② 犹豫或等待')}</h3>
 <label for="decision-range" class="decision-output"><span id="decision-value">${state.decide}</span> <small>${label('min / day','分钟／天')}</small></label>
 <input class="range" id="decision-range" type="range" min="0" max="120" step="5" value="${state.decide}" aria-label="Extra choosing or waiting minutes per day">
 <p class="help">${label('No extra time? Set it to 0.','没有额外耗时就选 0。')}</p></section>
 <div class="actions"><button class="button ghost classroom-button" data-view="day">${label('← Back','← 上一步')}</button><button class="button accent classroom-button" id="delays-next" ${!r.valid?'disabled':''}>${label('Time to tear ↓','开始撕纸 ↓')}</button></div>
 </section><aside class="panel sidebar" id="day-sidebar">${daySidebar(true)}</aside></div>${futurePill(true)}`;
}
function tearPage(){
 const r=calculate(state),groups=tearGroups(state);
 state.tearIndex=Math.min(state.tearIndex,groups.length);
 const ix=state.tearIndex,g=groups[ix],past=groups.slice(0,ix).reduce((a,c)=>a+c.hours,0);
 const totalLeft=Math.max(0,24-past),piece=g?g.hours:0,nextLeft=Math.max(0,totalLeft-piece);
 const nextStart=(past+piece)/24*100,remainingWidth=nextLeft/24*100;
 return `${progress()}<section class="tear-main">${g
  ? stepHeading('Tear the paper','逐段撕纸','Pull the coloured piece down or use the button.','下拉彩纸，或点「撕下这一段」。')
  : stepHeading('Your remaining time','剩下的时间','See how much time you can still choose.','看看一天里还剩多少时间。')}
 ${g?`<div class="tear-meta"><span class="tear-tag"><i style="background:${g.color}"></i>${label(g.name,g.cn)}</span><p class="tear-counter">${label(`Piece ${ix+1} of ${groups.length}`,`第 ${ix+1}／${groups.length} 段`)}</p></div>`:''}
 <div class="life-strip" style="--tear-edge:${nextStart}%"><div class="ghost-paper"></div>${g?`<div class="paper-piece cut-piece" id="cut-piece" style="left:${past/24*100}%;width:${piece/24*100}%;background-color:${g.color}88" aria-hidden="true">${piece/24>0.17?'<span class="tear-down">↓</span>':''}</div>`:''}
 ${nextLeft>0?`<div class="paper-piece" style="left:${nextStart}%;width:${remainingWidth}%;background-color:${g?'#fffdf6':'#d7e7d7'}" aria-hidden="true">${remainingWidth>22?`<small>${g?label('Unassigned','还没分配'):label('Open time','自己的时间')}</small>`:''}</div>`:''}</div>
 ${g?`<div class="tear-repeat"><div><small>${label('Each day','每天')}</small><b>${label(hoursText(g.hours),zhHours(g.hours))}</b></div><span aria-hidden="true">→</span><div><small>${label('Over one year','一年累积')}</small><b>${label(`${fixed(g.hours*365/24,1)} full days`,`约 ${fixed(g.hours*365/24,1)} 个整天`)}</b></div></div>`:''}
 <p class="tear-remaining">${label(g?`After this tear: ${hoursText(nextLeft)} left`:`Open time: ${hoursText(nextLeft)} a day`,g?`撕下后还剩 ${zhHours(nextLeft)}／天`:`每天可自己安排 ${zhHours(nextLeft)}`)}</p>
 <div class="button-row">${g?`<button class="button accent classroom-button" id="tear-next">${label('Tear this piece ↓','撕下这一段 ↓')}</button><button class="button ghost classroom-button" id="tear-all">${label('Skip to remaining time','直接看剩余时间')}</button>`:`<button class="button accent classroom-button" id="see-result">${label('See my result →','查看结果 →')}</button>`}</div>
 <button class="text-button" data-view="day">${label('Change my day','修改一天的安排')}</button></section>`;
}
function resultPage(){
 const r=calculate(state),groups=tearGroups(state);
 if(!state.baseline)state.baseline=snapshot();
 const base=calculate({...state,...state.baseline}),gain=Math.max(0,r.freeHours-base.freeHours);
 return `${progress()}<section class="game-result">
 <div class="result-hero"><div><h2>${label('Time you can choose','每天可以自己安排')}</h2><div class="result-number" id="result-daily">${label(hoursText(r.freeHours),zhHours(r.freeHours))}</div></div>
 <div><span class="eyebrow">${label('Your whole paper strip','你的一整条纸')}</span><div class="result-strip" role="img" aria-label="Past, scheduled time and open time"><span style="width:${state.age/state.endAge*100}%;background:#d6cec0"></span>${groups.map(g=>`<span style="width:${(state.endAge-state.age)/state.endAge*g.hours/24*100}%;background:${g.color}" title="${esc(g.name)}"></span>`).join('')}<span style="width:${r.remainingYears/state.endAge*r.freeHours/24*100}%;background:#6a9c86" title="Open time"></span></div>
 <p class="result-legend">${label('Green is still open.','绿色是还可以自己安排的时间。')}</p></div></div>
 <section class="reading-bridge" aria-labelledby="reading-title"><h3 id="reading-title">${label('Talk with a partner','和同桌聊一聊')}</h3>
 <ol><li>${label('Which piece surprised you most?','哪一段撕下来时最让你意外？')}</li><li>${label('What would you do with 15 minutes a day?','如果每天腾出 15 分钟，你想用来做什么？')}</li></ol>
 <p class="reading-next">It is how we spend our time that makes the difference.</p></section>
 <details class="quiet-details result-extras"><summary>${label('Time details and experiments','查看明细和时间实验')}</summary>
 ${labBanner()}
 <div class="result-stats"><div class="result-stat"><strong>${r.remainingYears}</strong><small>imagined years ahead<span class="cn">游戏设定剩余年数</span></small></div><div class="result-stat"><strong id="result-years">${fixed(r.freeYears,2)}</strong><small>years of open time<span class="cn">自由时间折合年数（24h/天）</span></small></div><div class="result-stat"><strong>${fixed(r.freeTotalHours,0)}</strong><small>open hours in all<span class="cn">累计尚未安排的小时</span></small></div></div>
 <div class="result-bottom"><section class="breakdown"><h3>Where your time goes<span class="cn">每天的选择，累积成一生</span></h3><table><thead><tr><th scope="col">Activity</th><th scope="col">Each day</th><th scope="col">Years of time</th></tr></thead><tbody>${groups.map(g=>`<tr><td><i style="background:${g.color}"></i>${g.name}</td><td>${hoursText(g.hours)}</td><td>${fixed(r.remainingYears*g.hours/24,2)}</td></tr>`).join('')}<tr class="open-row"><td><i style="background:#6a9c86"></i>Still open</td><td>${hoursText(r.freeHours)}</td><td>${fixed(r.freeYears,2)}</td></tr></tbody></table></section>
 <section><div class="experiment"><span class="eyebrow">TRY ONE SMALL CHANGE</span><h3>What if…?</h3>${hint('Change one choice. See what it opens up.','试着改一个选择，看看能多出多少时间。')}
 <button data-change="phone" ${state.budget.phone<.5?'disabled':''}>30 min less on my phone<span class="cn">每天少刷30分钟手机</span></button>
 <button data-change="decide" ${state.decide<10?'disabled':''}>10 min less choosing / waiting<span class="cn">每天少10分钟犹豫或等待</span></button>
 <button data-change="focus" ${state.focus===0?'disabled':''}>One step more focused<span class="cn">让分心程度降低一档</span></button>
 <div class="saving" aria-live="polite">${gain>1e-8?'+'+Math.round(gain*60)+' min / day':''}</div>
 ${gain>1e-8?`<p style="margin:0 0 10px">That is ${fixed(gain*365,0)} more hours each year.</p><button class="text-button" id="undo-change">Back to my first plan</button>`:''}
 </div><div class="reflection"><label for="reflection">${label('Write one small plan','写一个明天就能开始的小计划')}</label><p class="starter">I’ll spend ___ minutes a day on ___ because ___.</p><textarea id="reflection" maxlength="1000" aria-label="Your reflection / 我的小计划">${esc(state.reflection)}</textarea></div></section></div>
 <details class="math-note"><summary>How do the numbers work? <span class="cn" style="display:inline">计算方式</span></summary><p>Years ahead = end age − your age. Open time each day = 24h − your daily plan − extra delays.<br>Total open hours = years ahead × 365 × open hours each day. Years of time = total open hours ÷ 24 ÷ 365.<br>One “year of time” means 365 full 24-hour days. It does not add years to your life. The game repeats your chosen average day; it does not model holidays, retirement or changing needs.<span class="cn">年数按365天、每天24小时折算。假设日常安排不变，不模拟假期、退休与不同人生阶段，也不预测寿命。照护时间不改变寿命设定。所有输入仅保存在本机浏览器中。</span></p></details>
 <div class="actions"><button class="button ghost" id="replay">${label('Tear again','再撕一次')}</button><button class="button secondary" id="print-result">${label('Print / save','打印或保存')}</button></div></details>
 <div class="actions result-actions"><button class="button secondary" data-view="day">${label('Edit my day','调整一天的安排')}</button><button class="button" id="copy-result">${label('Copy my time card','复制时间卡')}</button></div></section>`;
}
function render(){
 const keepResultDetails=state.view==='result'&&app.querySelector('.result-extras')?.open;
 if(labCleanup){labCleanup();labCleanup=null;}
 applyTips();document.body.classList.toggle('budget-mode',['day','delays'].includes(state.view));
 app.innerHTML=({welcome,age:agePage,day:dayPage,delays:delaysPage,tear:tearPage,result:resultPage,lab:labPage}[state.view]||welcome)();
 if(keepResultDetails)app.querySelector('.result-extras').open=true;
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
 document.getElementById('years-ahead').innerHTML=(err?'—':state.endAge-state.age)+'<small>'+label(' years',' 年')+'</small>';
 document.getElementById('age-paper').innerHTML=agePaper();
 document.getElementById('tear-past').disabled=!!err;document.getElementById('tear-past').innerHTML=label('Tear the past ↓','撕掉过去 ↓');document.getElementById('age-next').disabled=true;
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
 const open=document.querySelector('#open-total');if(open){open.textContent=used>24?'—':hoursText(24-used);open.className=used>24?'over':'good';}
 const warning=document.querySelector('#budget-warning');if(warning)warning.innerHTML=used>24?budgetWarning(used):'';
 const context=document.querySelector('#budget-context');if(context)context.textContent=budgetContext(r,includeDelays);
 const next=document.querySelector(includeDelays?'#delays-next':'#day-next');if(next)next.disabled=includeDelays?!r.valid:used>24+1e-8;
 const liveFuture=document.querySelector('#live-future');if(liveFuture)liveFuture.innerHTML=liveImpact(includeDelays);
 const pill=document.querySelector('#mobile-live-impact');if(pill)pill.outerHTML=futurePill(includeDelays);
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

