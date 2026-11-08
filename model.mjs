export const CATEGORIES = [
  {id:'sleep', name:'Sleep', cn:'睡眠', icon:'moon', color:'#7086b5', value:8},
  {id:'work', name:'Class / work', cn:'上课或上班', icon:'book', color:'#d59a57', value:6},
  {id:'study', name:'Extra study / work', cn:'课外学习、额外工作', icon:'pen', color:'#ba8655', value:1},
  {id:'travel', name:'Getting around', cn:'通勤、交通', icon:'route', color:'#a6a58a', value:.5},
  {id:'daily', name:'Meals, wash & shower', cn:'吃饭、洗漱、洗澡', icon:'cup', color:'#bca58f', value:1.5},
  {id:'people', name:'People & pets', cn:'家人、朋友、爱人、宠物', icon:'heart', color:'#ce8d93', value:1},
  {id:'play', name:'Going out & fun', cn:'出去玩、娱乐', icon:'sun', color:'#d4b063', value:.25},
  {id:'sport', name:'Move & exercise', cn:'运动', icon:'move', color:'#80a491', value:.5},
  {id:'phone', name:'Phone for fun', cn:'刷手机、短视频、游戏；不含学习', icon:'phone', color:'#a49cc0', value:1.5},
  {id:'chores', name:'Chores & errands', cn:'家务、办事', icon:'home', color:'#9daaa1', value:.5},
  {id:'care', name:'Care & recovery', cn:'就医、治疗、额外休养；不重复算睡眠', icon:'care', color:'#a4b8c6', value:.25},
  {id:'other', name:'Other daily time', cn:'其他未计入的事情', icon:'dots', color:'#b8aaa6', value:0}
];
export const FOCUS = [
  {name:'I stay focused', cn:'专注完成', rate:0, help:'No extra time.'},
  {name:'A few stops', cn:'偶尔分心', rate:.15, help:'15% more time on flexible tasks.'},
  {name:'Many stops', cn:'经常分心', rate:.30, help:'30% more time on flexible tasks.'}
];
export function defaultState(){
 return {version:1, view:'welcome', age:18, endAge:80, pastTorn:false,
  budget:Object.fromEntries(CATEGORIES.map(c=>[c.id,c.value])), focus:1, decide:20,
  tearIndex:0, tips:true, reflection:'', baseline:null};
}
export function ageError(s){
 if(!Number.isInteger(s.age)||s.age<1||s.age>110) return 'Enter an age from 1 to 110.';
 if(!Number.isInteger(s.endAge)||s.endAge<=s.age||s.endAge>120) return 'Choose an end age above your age, up to 120.';
 return '';
}
export function calculate(s){
 const ageMessage=ageError(s);
 const values=CATEGORIES.map(c=>s.budget[c.id]);
 if(values.some(v=>!Number.isFinite(v)||v<0||v>16)) return {valid:false,error:'Use 0 to 16 hours for each activity.'};
 if(!Number.isInteger(s.focus)||!FOCUS[s.focus]||!Number.isFinite(s.decide)||s.decide<0||s.decide>120) return {valid:false,error:'Check your small-delay choices.'};
 const baseHours=values.reduce((a,b)=>a+b,0);
 const focusHours=(s.budget.study+s.budget.chores)*FOCUS[s.focus].rate;
 const decisionHours=s.decide/60;
 const usedHours=baseHours+focusHours+decisionHours;
 const rawFree=24-usedHours;
 const remainingYears=s.endAge-s.age;
 const remainingDays=remainingYears*365;
 const freeHours=Math.max(0,rawFree);
 return {valid:!ageMessage&&rawFree>=-1e-8,error:ageMessage||(rawFree < -1e-8?'Your day has more than 24 hours. Change your choices.':''),
  baseHours,focusHours,decisionHours,usedHours,freeHours,overHours:Math.max(0,-rawFree),
  remainingYears,remainingDays,freeTotalHours:remainingDays*freeHours,freeYears:remainingYears*freeHours/24,
  scheduledYears:remainingYears*usedHours/24};
}
export function tearGroups(s){
 const b=s.budget,r=calculate(s);
 const groups=[
  {id:'sleep',name:'Sleep',cn:'睡眠',hours:b.sleep,color:'#7086b5',line:'Rest is part of your life.'},
  {id:'learn',name:'Class, work & study',cn:'上课、工作和额外学习',hours:b.work+b.study,color:'#c08e59',line:'Time for the things you need to do.'},
  {id:'daily',name:'Daily needs',cn:'交通、吃饭洗漱、家务及其他',hours:b.travel+b.daily+b.chores+b.other,color:'#aca18d',line:'Small daily things add up.'},
  {id:'people',name:'People, pets & fun',cn:'陪伴与娱乐',hours:b.people+b.play,color:'#ce8d93',line:'These moments matter, too.'},
  {id:'sport',name:'Move & exercise',cn:'运动',hours:b.sport,color:'#80a491',line:'Time to look after yourself.'},
  {id:'care',name:'Care & recovery',cn:'就医与额外休养',hours:b.care,color:'#a4b8c6',line:'Care is a real part of life.'},
  {id:'phone',name:'Phone for fun',cn:'休闲刷手机',hours:b.phone,color:'#a49cc0',line:'A little each day becomes a lot.'},
  {id:'delays',name:'Small delays',cn:'额外分心和做决定的时间',hours:r.focusHours+r.decisionHours,color:'#d37c60',line:'Only count extra time, once.'}
 ];
 return groups.filter(g=>g.hours>1e-8);
}
export function hoursText(hours){
 const minutes=Math.max(0,Math.round(hours*60+1e-8));
 const h=Math.floor(minutes/60),m=minutes%60;
 return h&&m?h+'h '+m+'m':h?h+'h':m+'m';
}
export const fixed=(n,d=1)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
export function cleanState(raw){
 const s=defaultState();
 if(!raw||raw.version!==1)return s;
 const views=['welcome','age','day','delays','tear','result','lab'];
 if(views.includes(raw.view))s.view=raw.view;
 for(const k of ['age','endAge'])if(Number.isInteger(raw[k]))s[k]=raw[k];
 if(ageError(s)){s.age=18;s.endAge=80;s.view='age';}
 for(const c of CATEGORIES)if(Number.isFinite(raw.budget?.[c.id]))s.budget[c.id]=Math.max(0,Math.min(16,raw.budget[c.id]));
 if(Number.isInteger(raw.focus)&&FOCUS[raw.focus])s.focus=raw.focus;
 if(Number.isFinite(raw.decide))s.decide=Math.max(0,Math.min(120,raw.decide));
 s.tips=raw.tips!==false;s.pastTorn=raw.pastTorn===true;
 s.tearIndex=Number.isInteger(raw.tearIndex)?Math.max(0,Math.min(8,raw.tearIndex)):0;
 s.reflection=typeof raw.reflection==='string'?raw.reflection.slice(0,1000):'';
 if(['tear','result','lab'].includes(s.view)&&!calculate(s).valid)s.view='day';
 return s;
}

