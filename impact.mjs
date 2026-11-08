import {calculate,FOCUS} from './model.mjs?v=2';
export const CHANGE_OPTIONS=[
 {id:'phone',name:'Phone for fun',cn:'刷手机'},
 {id:'decide',name:'Choosing / waiting',cn:'犹豫、等待'},
 {id:'study',name:'Extra study / work',cn:'额外学习、工作'},
 {id:'chores',name:'Chores & errands',cn:'家务、办事'},
 {id:'play',name:'Going out & fun',cn:'娱乐、出去玩'},
 {id:'people',name:'People & pets',cn:'陪伴'},
 {id:'sport',name:'Move & exercise',cn:'运动'},
 {id:'travel',name:'Getting around',cn:'交通'}
];
export function changePlan(base,activity,direction,requestedMinutes){
 const before=calculate(base);
 const valid=CHANGE_OPTIONS.some(x=>x.id===activity)&&['less','more'].includes(direction)&&Number.isFinite(requestedMinutes)&&before.valid;
 if(!valid)throw new Error('Use a valid daily plan and change.');
 const next={...base,budget:{...base.budget}};
 const currentMinutes=activity==='decide'?base.decide:base.budget[activity]*60;
 const factor=['study','chores'].includes(activity)?1+FOCUS[base.focus].rate:1;
 const headroom=activity==='decide'?120-currentMinutes:16*60-currentMinutes;
 const available=direction==='less'?currentMinutes:Math.min(headroom,before.freeHours*60/factor);
 const maxMinutes=Math.max(0,Math.floor((Math.min(180,available)+1e-8)/5)*5);
 const minutes=Math.max(0,Math.min(maxMinutes,requestedMinutes));
 const signed=direction==='less'?-minutes:minutes;
 if(activity==='decide')next.decide+=signed;else next.budget[activity]+=signed/60;
 const after=calculate(next);
 if(!after.valid)throw new Error('The changed day must fit in 24 hours.');
 return {before,after,next,minutes,maxMinutes,dailyDelta:after.freeHours-before.freeHours,focusIncluded:factor!==1};
}
export function accumulate(dailyDelta,days,sessionMinutes=30){
 if(!Number.isFinite(dailyDelta)||!Number.isFinite(days)||days<0||!Number.isFinite(sessionMinutes)||sessionMinutes<=0)throw new Error('Invalid time scale.');
 const hours=dailyDelta*days,fullDays=hours/24,years=fullDays/365;
 return {hours,fullDays,years,sessions:Math.floor((Math.abs(hours)*60+1e-8)/sessionMinutes)};
}

