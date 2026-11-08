import {calculate,hoursText,fixed} from './model.mjs?v=2';
import {CHANGE_OPTIONS,changePlan,accumulate} from './impact.mjs?v=2';
export function mountTimeLab(container,base,options={}){
 const {onBack=()=>{},onApply=()=>{},onOwnDay=()=>{},fromWelcome=false}=options;
 const uses=[{id:'read',name:'Read for 30 min',cn:'读书30分钟',minutes:30},{id:'walk',name:'Walk for 30 min',cn:'散步30分钟',minutes:30},{id:'family',name:'Time with family: 1h',cn:'陪家人1小时',minutes:60},{id:'learn',name:'Learn something: 1h',cn:'学习新技能1小时',minutes:60}];
 const initial=calculate(base);
 let activity=base.budget.phone>=.5?'phone':base.decide>=5?'decide':'phone';
 let direction=(activity==='phone'&&base.budget.phone<.5)?'more':'less';
 let minutes=30,period=365,use='read',elapsed=0,playing=false,raf=0,lastPaint=0;
 const spans=[{days:1,label:'1 day'},{days:7,label:'1 week'},{days:30,label:'1 month'},{days:365,label:'1 year'},{days:initial.remainingDays,label:'Your '+initial.remainingYears+' years'}].filter((x,i,a)=>a.findIndex(y=>y.days===x.days)===i);
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cn=t=>`<span class="cn">${t}</span>`;
 const paperCells=Array.from({length:48},()=>'<span class="time-ticket"><i></i></span>').join('');
 function impact(){const r=changePlan(base,activity,direction,minutes);minutes=r.minutes;return r;}
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;playing=false;}
 function shell(){
 container.innerHTML=`<section class="time-lab">
 <div class="lab-top"><button class="text-button" data-lab="back">← ${fromWelcome?'Back':'My result'}</button><span class="lab-source">${fromWelcome?'YOUR CURRENT GAME':'YOUR OWN DAY'} · Age ${base.age} → ${base.endAge}</span></div>
 <div class="page-heading"><span class="eyebrow">THE TIME MACHINE / 每天一点，后来很多</span><h2>Just a little.<br><em>Every single day.</em></h2><p>Move the slider. Play the days. Watch a small choice grow.${cn('拖动分钟数，再按播放。看每天的小变化，怎样累积成一大段时间。')}</p></div>
 <div class="lab-layout"><section class="lab-controls"><span class="eyebrow">01 / CHANGE ONE THING</span>
 <label for="lab-activity">Where will the time move?${cn('想改变哪一项用时？')}</label>
 <select id="lab-activity">${CHANGE_OPTIONS.map(x=>`<option value="${x.id}" ${x.id===activity?'selected':''}>${x.name} · ${x.cn}</option>`).join('')}</select>
 <div class="lab-directions" role="group" aria-label="Less or more time"><button data-lab-direction="less" class="${direction==='less'?'selected':''}" aria-pressed="${direction==='less'}">Less time<span class="cn">每天少一点</span></button><button data-lab-direction="more" class="${direction==='more'?'selected':''}" aria-pressed="${direction==='more'}">More time<span class="cn">每天多一点</span></button></div>
 <label for="lab-minutes" class="lab-minute-number"><span id="lab-minute-count">30</span><small>min / day</small></label><input id="lab-minutes" class="range" type="range" min="0" max="90" step="5" value="30" aria-label="Daily change in minutes">
 <p id="lab-limit-note" class="help"></p><div class="lab-daily-delta" id="lab-daily-delta"></div>
 <div class="lab-open-compare"><span class="eyebrow">OPEN TIME EACH DAY / 每天尚未安排</span><div class="daily-paper-row"><span>Now</span><div><i id="lab-before-daily"></i></div><b id="lab-before-time"></b></div><div class="daily-paper-row"><span>New day</span><div><i id="lab-after-daily"></i></div><b id="lab-after-time"></b></div><small>Open time only · same scale.${cn('两条用同一尺度，只放大比较未安排时间。')}</small></div>
 <div class="lab-scale-summary" id="lab-scale-summary"></div><button class="button accent lab-mobile-play" data-lab="play">Play this change ↓</button>
 </section>
 <section class="lab-stage"><div class="lab-stage-top"><div><span class="eyebrow">02 / PUT THE DAY ON REPEAT</span><h3>Watch it add up.</h3></div><button class="button accent" data-lab="play" id="lab-play">▶ Play the days</button></div>
 <div class="lab-spans" role="group" aria-label="Time span">${spans.map(x=>`<button class="chip ${x.days===period?'selected':''}" data-lab-days="${x.days}" aria-pressed="${x.days===period}">${x.label}</button>`).join('')}</div>
 <div class="lab-clock"><div><span id="lab-day-count">Day 0</span><small id="lab-year-count">0 years passed</small></div><p>Fast forward${cn('加速播放，不是真实倒计时')}</p></div>
 <label class="sr-only" for="lab-seek">Days passed in the simulation</label><input id="lab-seek" class="range lab-seek" type="range" min="0" max="${period}" step="1" value="0"><div class="lab-axis"><span>Today</span><span id="lab-target-label">1 year later</span></div>
 <div class="collected-papers"><span class="eyebrow">OPEN HOURS COLLECTED / 自由时间的累计</span><div class="collected-row"><label>Current day</label><div class="paper-track"><i id="lab-current-paper"></i></div><b id="lab-current-total">0h</b></div><div class="collected-row"><label>Changed day</label><div class="paper-track"><i id="lab-changed-paper"></i></div><b id="lab-changed-total">0h</b></div><small>Both paper strips use the same scale.</small></div>
 <div class="lab-bank-head"><span id="lab-bank-label">OPEN TIME MOVED</span><strong id="lab-bank-total">0h</strong><p id="lab-full-days">0 full days</p></div>
 <div class="time-ticket-grid" aria-hidden="true">${paperCells}</div><div class="lab-ticket-key"><span>1 little paper = 24h${cn('每张小纸片代表全天24小时')}</span><span id="lab-ticket-more"></span></div>
 <div class="lab-use"><label for="lab-use">Imagine using it for…${cn('这段时间可以用来……')}</label><select id="lab-use">${uses.map(u=>`<option value="${u.id}">${u.name} · ${u.cn}</option>`).join('')}</select><div><strong id="lab-use-count">0</strong><span id="lab-use-name">reading sessions</span></div><p id="lab-use-note">Choose what matters to you.</p></div>
 <div id="lab-status" class="sr-only" role="status" aria-live="polite"></div>
 </section></div>
 <div class="lab-bottom"><p>A different daily choice changes your plan, not the speed of life.${cn('改变的是时间的用途，不是生命流速或寿命。1年按365天计算。')}</p><div class="button-row">${fromWelcome?'<button class="button" data-lab="own">Try my own day →</button>':'<button class="button" data-lab="apply" id="lab-apply">Keep this change →</button>'}<button class="button secondary" data-lab="back">${fromWelcome?'Back to the paper game':'Back without changing'}</button></div></div>
 </section>`;
 }
 function refresh(reset=true){
  const r=impact();if(reset){stop();elapsed=0;}
  const range=container.querySelector('#lab-minutes');range.max=r.maxMinutes;range.value=minutes;range.disabled=r.maxMinutes===0;
  container.querySelector('#lab-minute-count').textContent=minutes;
  container.querySelector('#lab-limit-note').innerHTML=`${direction==='less'?'Move time out of this activity.':'Move open time into this activity.'}${r.focusIncluded?cn('计算包含你选择的分心带来的额外耗时。'):''}`;
  container.querySelector('#lab-daily-delta').innerHTML=`<b>${r.dailyDelta>=0?'+':'−'}${hoursText(Math.abs(r.dailyDelta))}</b> <span>open time / day${cn('每天可自行安排的时间变化')}</span>`;
  container.classList.toggle('time-spent',r.dailyDelta<0);
  const max=Math.max(.5,r.before.freeHours,r.after.freeHours);
  container.querySelector('#lab-before-daily').style.width=r.before.freeHours/max*100+'%';
  container.querySelector('#lab-after-daily').style.width=r.after.freeHours/max*100+'%';
  container.querySelector('#lab-before-time').textContent=hoursText(r.before.freeHours);
  container.querySelector('#lab-after-time').textContent=hoursText(r.after.freeHours);
  const delta=Math.abs(r.dailyDelta);
  container.querySelector('#lab-scale-summary').innerHTML=[{n:'1 week',d:7},{n:'1 year',d:365},{n:initial.remainingYears+' years',d:initial.remainingDays,lifetime:true}].map(t=>`<div><span>${t.n}</span><b>${t.lifetime?fixed(delta*t.d/24/365,2)+' years':hoursText(delta*t.d)}</b></div>`).join('')+`<small>Time moved, put together.${cn('最后一项按24小时整天折算为年，不是增加或减少寿命。')}</small>`;
  container.querySelector('#lab-seek').max=period;
  const apply=container.querySelector('#lab-apply');if(apply)apply.disabled=minutes===0;
  const play=container.querySelector('#lab-play');play.disabled=minutes===0;
  updateFrame(r);
 }
 function updateFrame(r=impact()){
  const passed=Math.min(period,Math.floor(elapsed+1e-8));
  const accumulated=accumulate(r.dailyDelta,passed,uses.find(u=>u.id===use).minutes);
  const absHours=Math.abs(accumulated.hours),days=absHours/24,delta=r.dailyDelta;
  container.querySelector('#lab-day-count').textContent='Day '+fixed(passed,0);
  container.querySelector('#lab-year-count').textContent=fixed(passed/365,1)+' years passed';
  container.querySelector('#lab-seek').value=passed;
  container.querySelector('#lab-target-label').textContent=period<365?period+' days later':fixed(period/365,0)+' years later';
  const totalScale=Math.max(1,r.before.freeHours,r.after.freeHours)*period;
  container.querySelector('#lab-current-paper').style.width=r.before.freeHours*passed/totalScale*100+'%';
  container.querySelector('#lab-changed-paper').style.width=r.after.freeHours*passed/totalScale*100+'%';
  container.querySelector('#lab-current-total').textContent=hoursText(r.before.freeHours*passed);
  container.querySelector('#lab-changed-total').textContent=hoursText(r.after.freeHours*passed);
  container.querySelector('#lab-bank-label').textContent=delta>=0?'MORE OPEN TIME, PUT TOGETHER':'OPEN TIME MOVED INTO THIS ACTIVITY';
  container.querySelector('#lab-bank-total').textContent=(delta<0?'−':'+')+hoursText(absHours);
  container.querySelector('#lab-full-days').textContent=fixed(days,2)+' full 24-hour days';
  container.querySelectorAll('.time-ticket i').forEach((node,i)=>node.style.height=Math.max(0,Math.min(1,days-i))*100+'%');
  container.querySelector('#lab-ticket-more').textContent=days>48?'+ '+fixed(days-48,2)+' more full days':'';
  const u=uses.find(u=>u.id===use);
  container.querySelector('#lab-use-count').textContent=fixed(accumulated.sessions,0);
  container.querySelector('#lab-use-name').textContent=(u.id==='read'?'reading sessions':u.id==='walk'?'walks':u.id==='family'?'family visits':'learning sessions');
  container.querySelector('#lab-use-note').innerHTML=delta>=0?`Time for this many ${u.minutes}-minute moments.${cn('把累计时间换成一段段具体活动。')}`:`This many ${u.minutes}-minute moments move to your chosen activity.${cn('这些时段被挪到你增加用时的那一项中。')}`;
  container.querySelector('#lab-play').textContent=playing?'Ⅱ Pause':passed>=period?'↺ Play again':'▶ Play the days';
 }
 function play(){
  if(playing){stop();updateFrame();return;}
  if(minutes===0)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){elapsed=period;updateFrame();container.querySelector('#lab-status').textContent='Final time shown. Motion is reduced on this device.';return;}
  if(elapsed>=period)elapsed=0;
  playing=true;const start=performance.now(),from=elapsed,duration=8000*(1-from/period);
  function tick(now){
   elapsed=Math.min(period,from+(period-from)*(now-start)/Math.max(1,duration));
   if(now-lastPaint>70||elapsed>=period){lastPaint=now;updateFrame();}
   if(elapsed<period&&playing)raf=requestAnimationFrame(tick);else{playing=false;raf=0;elapsed=Math.min(elapsed,period);updateFrame();container.querySelector('#lab-status').textContent='The simulation is complete.';}
  }
  updateFrame();raf=requestAnimationFrame(tick);
 }
 function click(e){
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.labDirection){direction=b.dataset.labDirection;container.querySelectorAll('[data-lab-direction]').forEach(x=>{const selected=x.dataset.labDirection===direction;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected));});refresh();return;}
  if(b.dataset.labDays){period=Number(b.dataset.labDays);container.querySelectorAll('[data-lab-days]').forEach(x=>{const selected=Number(x.dataset.labDays)===period;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected));});refresh();return;}
  if(b.dataset.lab==='play'){play();if(b.classList.contains('lab-mobile-play'))container.querySelector('.lab-stage').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(b.dataset.lab==='back'){stop();onBack();return;}
  if(b.dataset.lab==='own'){stop();onOwnDay();return;}
  if(b.dataset.lab==='apply'){const r=impact();stop();onApply(r.next);return;}
 }
 function input(e){
  if(e.target.id==='lab-minutes'){minutes=Number(e.target.value);refresh();}
  if(e.target.id==='lab-seek'){stop();elapsed=Number(e.target.value);updateFrame();}
 }
 function change(e){
  if(e.target.id==='lab-activity'){activity=e.target.value;minutes=30;refresh();}
  if(e.target.id==='lab-use'){use=e.target.value;updateFrame();}
 }
 shell();container.addEventListener('click',click);container.addEventListener('input',input);container.addEventListener('change',change);refresh();
 return ()=>{stop();container.removeEventListener('click',click);container.removeEventListener('input',input);container.removeEventListener('change',change);};
}

