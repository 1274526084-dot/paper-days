import {CATEGORIES,FOCUS,defaultState,ageError,calculate,tearGroups,hoursText,fixed,cleanState} from './model.mjs?v=2';
import {mountTimeLab} from './time-lab.mjs?v=2';

const STORE='paper-days-v1';
let state;
try{state=cleanState(JSON.parse(localStorage.getItem(STORE)));}catch{state=defaultState();}
let ripping=false,toastTimer;
let dayAnchor=null,labCleanup=null,labSource=null,labOrigin=state.pastTorn?'result':'welcome';
const app=document.querySelector('#app');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hint=(en,cn,cls='')=>`<p class="${cls}">${en}<span class="cn">${cn}</span></p>`;
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
 const ix=views.indexOf(state.view);
 return `<nav class="progress" aria-label="Game progress">${names.map((n,i)=>`<span class="step ${i===ix?'active':i<ix?'done':''}" ${i===ix?'aria-current="step"':''}><b>${i+1}</b><span>${n}</span></span>`).join('')}</nav>`;
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
 const b=document.querySelector('#tips-button');b.textContent='中文提示 '+(state.tips?'On':'Off');b.setAttribute('aria-pressed',String(state.tips));
}
function welcome(){
 return `<section class="intro">
 <div><span class="eyebrow">AN ENGLISH CLASSROOM EXPERIMENT</span><h1>Your life.<br>A strip<br>of <em>paper.</em></h1>
 ${hint('Tear the past. Plan a day.<br>See the time you can still choose.','撕去过去，安排一天，看看还有多少时间可以自己选择。','lede')}
 <div class="button-row"><button class="button accent" data-action="start">Take my strip <span aria-hidden="true">↗</span></button><button class="button secondary" data-open-lab>Watch a small change</button></div>
 ${hint('A simple game, not a life prediction.<br>You choose the age and the daily plan.','这是自己设定假设的游戏，不是寿命预测。','intro-note')}
 </div>
 <div class="paper-art" aria-hidden="true"><div class="art-caption">One long strip.<svg viewBox="0 0 50 50"><path d="M40 5Q15 12 15 38m0 0-6-9m6 9 8-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></div>
 <div class="paper-length"><span class="paper-year" style="top:8px">0</span><span class="paper-year" style="top:36%">18</span><span class="big-year">the years ahead</span><span class="paper-year" style="bottom:15px">80</span></div>
 <div class="art-past">18<small>YEARS ALREADY LIVED</small></div>
 <div class="art-open">NOT YET WRITTEN<b>Your next page.</b></div></div>
 </section><div class="mini-steps"><span><b>01</b>Your age</span><span><b>02</b>Your average day</span><span><b>03</b>Your open time</span></div>`;
}
function agePage(){
 const error=ageError(state);
 return `${progress()}<div class="two-col age-layout"><section class="primary">
 <div class="page-heading"><span class="eyebrow">01 / THE FIRST TEAR</span><h2>First, the past.</h2>${hint('How old are you? Choose an end age for this game.<br>Then pull the past down, or press “Tear the past”.','填写年龄与游戏假设的生命长度。向下拖动旧纸片，或点击按钮。')}</div>
 <div class="age-fields"><label for="age">I am<span class="cn">我现在的年龄</span><input id="age" inputmode="numeric" type="number" min="1" max="110" step="1" value="${state.age}"></label>
 <label for="end-age">Imagine a life to age<span class="cn">假设活到多少岁</span><input id="end-age" inputmode="numeric" type="number" min="${state.age+1}" max="120" step="1" value="${state.endAge}"></label></div>
 <div id="age-error" class="error" role="status">${error}</div>
 <div id="age-paper">${agePaper()}</div>
 <div class="actions"><button class="button secondary" id="tear-past" ${error||state.pastTorn?'disabled':''}>${state.pastTorn?'Past torn off ✓':'Tear the past ↓'}</button><button class="button" id="age-next" ${error||!state.pastTorn?'disabled':''}>Build my day →</button></div>
 </section><aside class="panel sidebar"><span class="eyebrow">A NEW PIECE</span><h3>Still ahead</h3><strong class="huge" id="years-ahead">${error?'—':state.endAge-state.age}<small style="font:14px var(--sans);letter-spacing:0"> years</small></strong>
 ${hint('This is your chosen time horizon.<br>Your real life can be different.','这是游戏设定，真实人生可能不同。','small side-line')}
 ${hint('Every piece is part of your life.<br>Not all planned time is “lost”.','睡眠、陪伴与健康也是有价值的人生。','plain-note')}</aside></div>`;
}
function agePaper(){
 const valid=!ageError(state),ratio=valid?state.age/state.endAge*100:25;
 return `<div class="paper-rack"><div class="rack-ticks"><span>Birth · 0</span><span>Age ${valid?state.endAge:'?'}</span></div><div class="life-strip">
 <div class="ghost-paper"></div>${state.pastTorn?`<span class="already-lived">already lived</span>`:`<div class="paper-piece past-piece" id="past-piece" style="left:0;width:${ratio}%" aria-hidden="true"><strong>${valid?state.age:'?'}</strong><small>YEARS<br>ALREADY LIVED</small></div>`}
 <div class="paper-piece future-piece" style="left:${ratio+.5}%;width:${99.5-ratio}%"><strong>${valid?state.endAge-state.age:'?'} years</strong><small>THE YEARS AHEAD</small></div></div>
 <p class="pull-hint">${state.pastTorn?'The past is gone. What will you do next?':'Pull the grey piece down ↓'}<span class="cn">${state.pastTorn?'过去已过，接下来怎么安排？':'向下撕去灰色部分'}</span></p></div>`;
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
 return `<div class="mobile-live-impact" id="mobile-live-impact"><div><span>Open each day</span><b>${used>24?'Too full':hoursText(24-used)}</b></div><div><span>${Math.abs(delta)>1e-8?'Your change → each year':'Move a slider. See your future.'}</span><b>${used>24?'Change your day':Math.abs(delta)>1e-8?(delta>0?'+':'−')+fixed(Math.abs(delta)*365/24,1)+' full days':'Daily choices add up.'}</b></div></div>`;
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
 <div class="side-line budget-total"><span>Still open<span class="cn">尚未安排</span></span><b id="open-total" class="${used>24?'over':'good'}">${used>24?'Too full':hoursText(free)}</b></div>
 <p id="budget-warning" class="error" aria-live="polite">${used>24?'Over by '+hoursText(used-24)+'. Change your day.':''}</p>
 <div id="live-future">${liveImpact(includeDelays)}</div>
 ${hint('Use an average day, including days off.','请按一周平均每天估计，包括休息日。','small side-line')}
 ${hint('Example: 7h of class × 5 days ÷ 7 ≈ 5h a day.','例如：每周上课5天，每天7小时，平均约5小时/天。','plain-note')}
 <p class="small">Count each minute once.<span class="cn">同一分钟只计一次：陪家人时刷手机，不要两边重复算。</span></p>`;
}
function budgetRow(c){
 return `<div class="budget-row" data-row="${c.id}"><div class="budget-label"><span class="category-icon" style="background:${c.color}33">${icon(c.icon)}</span><label for="num-${c.id}">${c.name}<span class="cn">${c.cn}</span></label></div>
 <div><div class="amount"><button data-adjust="${c.id}" data-delta="-.25" aria-label="Less time for ${c.name}">−</button><input id="num-${c.id}" data-budget="${c.id}" type="number" min="0" max="16" step=".25" inputmode="decimal" value="${state.budget[c.id]}" aria-label="${c.name}, hours per day"><span>h</span><button data-adjust="${c.id}" data-delta=".25" aria-label="More time for ${c.name}">+</button></div>
 <input class="range" type="range" min="0" max="16" step=".25" value="${state.budget[c.id]}" data-budget="${c.id}" aria-label="Adjust ${c.name} hours"><small class="row-future" id="future-${c.id}">Repeat daily → ${fixed(state.budget[c.id]*(state.endAge-state.age)/24,2)} years of time</small></div></div>`;
}
function dayPage(){
 if(!dayAnchor)dayAnchor=snapshot();
 return `${progress()}<div class="page-heading"><span class="eyebrow">02 / GIVE YOUR DAY A SHAPE</span><h2>Where does it go?</h2>${hint('Choose your hours on an average day.<br>The sample is only a starting point. Change every number you need.','估计平均每天各项用时。示例仅作起点，可以逐项修改。')}</div>
 <div class="two-col"><section class="primary"><div class="day-top"><div class="preset-row"><span>Start with:</span><button class="chip" data-preset="school">A sample day</button><button class="chip" data-preset="blank">A blank day</button></div>
 ${hint('Give each minute one main job.','每段时间只选一个主要用途，避免重复。','help')}</div>
 ${CATEGORIES.map(budgetRow).join('')}
 ${hint('Care & recovery means extra awake time for visits, treatment or rest. It does not shorten your chosen life.','就医休养只计额外清醒时间，不重复算睡眠，也不会自动改变假设寿命。','plain-note')}
 <div class="actions"><button class="button ghost" data-view="age">← Your age</button><button class="button" id="day-next" ${calculate(state).baseHours>24?'disabled':''}>Small delays →</button></div>
 </section><aside class="panel sidebar" id="day-sidebar">${daySidebar(false)}</aside></div>${futurePill(false)}`;
}
function delaysPage(){
 const r=calculate(state);
 return `${progress()}<div class="page-heading"><span class="eyebrow">03 / THE LITTLE IN-BETWEEN MOMENTS</span><h2>Small delays add up.</h2>${hint('Sometimes a task takes longer. Sometimes we cannot decide.<br>Add only time you have not counted before.','任务可能因分心变长，也可能因犹豫拖延；这里只加前面未算过的额外时间。')}</div>
 <div class="two-col"><section class="primary"><h3>When I do flexible tasks…<span class="cn">做课外学习、额外工作或家务时……</span></h3><div class="focus-options" role="group" aria-label="Focus choice">${FOCUS.map((f,i)=>`<button class="focus-card ${i===state.focus?'selected':''}" data-focus="${i}" aria-pressed="${i===state.focus}"><span class="dot"></span><div><b>${f.name}</b><span class="cn">${f.cn}</span></div><small>${f.help}</small></button>`).join('')}</div>
 <div class="delay-rule">Game rule: stops add 0%, 15% or 30% to extra study / work and chores only.<span class="cn">这是游戏规则，不是科学测评；固定上课/上班时间不会因此缩短。</span></div>
 <p class="plain-note" id="focus-extra">Extra time: <b>${hoursText(r.focusHours)}</b> a day.<span class="cn">仅增加在额外学习/工作与家务上的耗时。</span></p>
 <div class="section-gap"><h3>Time spent choosing or waiting<span class="cn">额外做决定、犹豫或等待的时间</span></h3><p class="help">What to wear? What to watch? Which task first?</p>
 <label for="decision-range" class="decision-output"><span id="decision-value">${state.decide}</span> <small>min / day</small></label>
 <input class="range" id="decision-range" type="range" min="0" max="120" step="5" value="${state.decide}" aria-label="Extra choosing or waiting minutes per day">
 ${hint('If you already counted these minutes in phone time or other tasks, do not add them again.','如果已算入刷手机或其他任务，就不要再加一次。','plain-note')}</div>
 <div class="actions"><button class="button ghost" data-view="day">← My day</button><button class="button accent" id="delays-next" ${!r.valid?'disabled':''}>Time to tear ↓</button></div>
 </section><aside class="panel sidebar" id="day-sidebar">${daySidebar(true)}</aside></div>${futurePill(true)}`;
}
function tearPage(){
 const r=calculate(state),groups=tearGroups(state);
 state.tearIndex=Math.min(state.tearIndex,groups.length);
 const ix=state.tearIndex,g=groups[ix],past=groups.slice(0,ix).reduce((a,c)=>a+c.hours,0);
 const totalLeft=Math.max(0,24-past),piece=g?g.hours:0,nextLeft=Math.max(0,totalLeft-piece);
 const nextStart=(past+piece)/24*100,remainingWidth=nextLeft/24*100;
 return `${progress()}<section class="tear-main"><div class="page-heading"><span class="eyebrow">04 / A LITTLE EACH DAY, A LOT OVER TIME</span><h2>${g?'Now, tear the time.':'This piece is still yours.'}</h2>${hint(g?'Set time aside for each part of your life. Pull the coloured piece down, or use the button.':'This is the time you have not planned yet. What will you choose? ',
 g?'逐段分出生活所需的时间。向下拖彩色纸片，或点击按钮。':'这是还没有安排的时间。你想怎样使用它？')}</div>
 <p class="tear-counter">${g?'PIECE '+(ix+1)+' OF '+groups.length:'ALL PIECES COUNTED'}</p>
 ${g?`<div class="tear-tag"><i style="background:${g.color}"></i>${g.name}<span class="cn" style="margin:0">${g.cn}</span></div>`:`<div class="tear-tag"><i style="background:#6a9c86"></i>Open time · ${hoursText(r.freeHours)} / day</div>`}
 <div class="life-strip"><div class="ghost-paper"></div>${g?`<div class="paper-piece cut-piece" id="cut-piece" style="left:${past/24*100}%;width:${piece/24*100}%;background-color:${g.color}88" aria-hidden="true"></div>`:''}
 ${nextLeft>0?`<div class="paper-piece" style="left:${nextStart}%;width:${remainingWidth}%;background-color:${g?'#fffdf6':'#d7e7d7'}" aria-hidden="true">${remainingWidth>22?`<strong>${fixed(r.remainingYears*nextLeft/24,1)}</strong><small>YEARS OF TIME</small>`:''}</div>`:''}</div>
 ${g?`<p class="tear-info"><b>${hoursText(g.hours)} a day</b> → about <b>${fixed(r.remainingYears*g.hours/24,2)} years</b> of time.<br><span class="help">${g.line}</span></p>`:`<p class="tear-info"><b>${hoursText(r.freeHours)} each day</b> · about <b>${fixed(r.freeYears,2)} years</b> put together.<span class="cn">按全天24小时折算的时间，不是增加的寿命。</span></p>`}
 ${g?`<div class="tear-repeat"><div><small>1 day</small><b>${hoursText(g.hours)}</b></div><span>→</span><div><small>1 year</small><b>${fixed(g.hours*365/24,1)} full days</b></div><span>→</span><div><small>${r.remainingYears} years</small><b>${fixed(r.remainingYears*g.hours/24,2)} full years</b></div></div><p class="tear-repeat-note">The same day, again and again.<span class="cn">同样的一天，重复累积；“天”和“年”均按24小时折算。</span></p>`:''}
 <div class="button-row">${g?`<button class="button accent" id="tear-next">Tear this piece ↓</button><button class="button ghost" id="tear-all">Show all at once</button>`:`<button class="button accent" id="see-result">See my time →</button>`}</div>
 <p class="tear-guide">${g?'Sleep, health and people are part of life, not wasted time.':'The smallest piece can hold something important.'}<span class="cn">${g?'睡眠、健康和陪伴都不是“浪费”。':'一小段时间，也能装下重要的事情。'}</span></p>
 <div class="tear-mini">${groups.slice(0,ix).map(t=>`<span style="border-color:${t.color}">${t.name} · ${hoursText(t.hours)}</span>`).join('')}</div>
 <button class="text-button" data-view="day">Change my day</button></section>`;
}
function resultPage(){
 const r=calculate(state),groups=tearGroups(state);
 if(!state.baseline)state.baseline=snapshot();
 const base=calculate({...state,...state.baseline}),gain=Math.max(0,r.freeHours-base.freeHours);
 return `${progress()}<section><div class="result-top"><div><span class="eyebrow">05 / YOUR NEXT PAGE</span><h2>Your time. Your choice.</h2><p style="margin-top:15px">Age ${state.age} now · imagine age ${state.endAge}<span class="cn">现在${state.age}岁，游戏假设到${state.endAge}岁。</span></p></div><div class="button-row"><button class="button secondary" data-view="day">Edit my day</button><button class="button" id="copy-result">Copy my time card</button></div></div>
 ${labBanner()}
 <div class="result-hero"><div><span class="eyebrow">OPEN TIME / STILL UNPLANNED</span><div class="result-number" id="result-daily">${hoursText(r.freeHours)}</div><h2>each day, for your own plans.</h2>${hint('Not empty time. Time you can choose.','不是空白的人生，而是尚未安排、可自己选择的时间。','plain-note')}</div>
 <div><span class="eyebrow">YOUR WHOLE PAPER STRIP</span><div class="result-strip" role="img" aria-label="Past, scheduled time and open time"><span style="width:${state.age/state.endAge*100}%;background:#d6cec0"></span>${groups.map(g=>`<span style="width:${(state.endAge-state.age)/state.endAge*g.hours/24*100}%;background:${g.color}" title="${esc(g.name)}"></span>`).join('')}<span style="width:${r.remainingYears/state.endAge*r.freeHours/24*100}%;background:#6a9c86" title="Open time"></span></div>
 <p class="result-legend">Past: ${state.age} years · Planned: ${fixed(r.scheduledYears,2)} years · Open: ${fixed(r.freeYears,2)} years<span class="cn">过去／未来已安排／未来未安排：均为24小时整天折算。</span></p>
 ${hint('If this average day stayed the same for the years ahead.','是假设日常模式一直不变的粗略估算；人生安排会变化。','plain-note')}</div></div>
 <div class="result-stats"><div class="result-stat"><strong>${r.remainingYears}</strong><small>imagined years ahead<span class="cn">游戏设定剩余年数</span></small></div><div class="result-stat"><strong id="result-years">${fixed(r.freeYears,2)}</strong><small>years of open time<span class="cn">自由时间折合年数（24h/天）</span></small></div><div class="result-stat"><strong>${fixed(r.freeTotalHours,0)}</strong><small>open hours in all<span class="cn">累计尚未安排的小时</span></small></div></div>
 <div class="result-bottom"><section class="breakdown"><h3>Where your time goes<span class="cn">每天的选择，累积成一生</span></h3><table><thead><tr><th scope="col">Activity</th><th scope="col">Each day</th><th scope="col">Years of time</th></tr></thead><tbody>${groups.map(g=>`<tr><td><i style="background:${g.color}"></i>${g.name}</td><td>${hoursText(g.hours)}</td><td>${fixed(r.remainingYears*g.hours/24,2)}</td></tr>`).join('')}<tr class="open-row"><td><i style="background:#6a9c86"></i>Still open</td><td>${hoursText(r.freeHours)}</td><td>${fixed(r.freeYears,2)}</td></tr></tbody></table></section>
 <section><div class="experiment"><span class="eyebrow">TRY ONE SMALL CHANGE</span><h3>What if…?</h3>${hint('Change one choice. See what it opens up.','试着改一个选择，看看能多出多少时间。')}
 <button data-change="phone" ${state.budget.phone<.5?'disabled':''}>30 min less on my phone<span class="cn">每天少刷30分钟手机</span></button>
 <button data-change="decide" ${state.decide<10?'disabled':''}>10 min less choosing / waiting<span class="cn">每天少10分钟犹豫或等待</span></button>
 <button data-change="focus" ${state.focus===0?'disabled':''}>One step more focused<span class="cn">让分心程度降低一档</span></button>
 <div class="saving" aria-live="polite">${gain>1e-8?'+'+Math.round(gain*60)+' min / day':''}</div>
 ${gain>1e-8?`<p style="margin:0 0 10px">That is ${fixed(gain*365,0)} more hours each year.</p><button class="text-button" id="undo-change">Back to my first plan</button>`:''}
 </div><div class="reflection"><label for="reflection">What will you do with your time?<span class="cn">你想把时间留给什么？</span></label><p class="starter">I want to spend more time on…<br>I can save time by…</p><textarea id="reflection" maxlength="1000" placeholder="Write a small plan…" aria-label="Your reflection">${esc(state.reflection)}</textarea></div></section></div>
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
 const err=ageError(state);document.getElementById('age-error').textContent=err;
 document.getElementById('years-ahead').innerHTML=(err?'—':state.endAge-state.age)+'<small style="font:14px var(--sans);letter-spacing:0"> years</small>';
 document.getElementById('age-paper').innerHTML=agePaper();
 document.getElementById('tear-past').disabled=!!err;document.getElementById('tear-past').textContent='Tear the past ↓';document.getElementById('age-next').disabled=true;
 wireDrag(document.getElementById('past-piece'),tearPast);persist();
 });
 }
}
function animationWait(){return matchMedia('(prefers-reduced-motion: reduce)').matches?15:650;}
async function tearPast(){
 if(ripping||state.pastTorn||ageError(state))return;
 ripping=true;document.querySelector('#tear-past').disabled=true;
 const piece=document.querySelector('#past-piece');if(piece){piece.style.transform='';piece.classList.add('torn');}
 await new Promise(resolve=>setTimeout(resolve,animationWait()));
 state.pastTorn=true;ripping=false;render();showToast('The past is gone. Your next choice is yours.');
}
async function tearNext(){
 if(ripping||state.view!=='tear')return;
 const groups=tearGroups(state);if(state.tearIndex>=groups.length)return;
 ripping=true;const button=document.querySelector('#tear-next');if(button)button.disabled=true;
 const piece=document.querySelector('#cut-piece');if(piece){piece.style.transform='';piece.classList.add('torn');}
 await new Promise(resolve=>setTimeout(resolve,animationWait()));
 state.tearIndex++;ripping=false;render();
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
 const warning=document.querySelector('#budget-warning');if(warning)warning.textContent=used>24?'Over by '+hoursText(used-24)+'. Change your day.':'';
 const next=document.querySelector(includeDelays?'#delays-next':'#day-next');if(next)next.disabled=includeDelays?!r.valid:used>24+1e-8;
 const liveFuture=document.querySelector('#live-future');if(liveFuture)liveFuture.innerHTML=liveImpact(includeDelays);
 const pill=document.querySelector('#mobile-live-impact');if(pill)pill.outerHTML=futurePill(includeDelays);
 for(const c of CATEGORIES){const node=document.querySelector('#future-'+c.id);if(node)node.textContent='Repeat daily → '+fixed(state.budget[c.id]*r.remainingYears/24,2)+' years of time';}
 const f=document.querySelector('#focus-extra');if(f)f.innerHTML='Extra time: <b>'+hoursText(r.focusHours)+'</b> a day.<span class="cn">仅增加在额外学习/工作与家务上的耗时。</span>';
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
 const b=e.target.closest('button');if(!b||b.disabled)return;
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
document.querySelector('#home-link').addEventListener('click',e=>{e.preventDefault();navigate('welcome');});
document.querySelector('#reset-button').addEventListener('click',()=>document.querySelector('#reset-dialog').showModal());
document.querySelector('#confirm-reset').addEventListener('click',()=>{const tips=state.tips;state=defaultState();state.tips=tips;dayAnchor=null;labSource=null;persist();render();window.scrollTo({top:0,behavior:'instant'});});
render();

