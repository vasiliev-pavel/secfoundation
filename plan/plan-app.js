/* ============================================================
   SEC//PLAN — логика трекера
   ============================================================ */
(function(){
  "use strict";
  const KEY = "secplan_progress_v1";
  let done = load();          // { "w1d1t0": true, ... }

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } }
  function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(done)); }catch(e){} }

  document.getElementById("mProfile").textContent = PLAN.meta.profile;
  document.getElementById("mGoal").textContent = PLAN.meta.goal;

  const host = document.getElementById("weekHost");

  // build a stable task id
  function tid(w,d,i){ return "w"+w+"d"+d+"t"+i; }

  // count total + done tasks for a week
  function weekStats(week){
    let total=0, ok=0;
    week.days.forEach(day=>{
      if(day.rest||!day.items) return;
      day.items.forEach((_,i)=>{
        total++;
        if(done[tid(week.n,day.d,i)]) ok++;
      });
    });
    return {total, ok};
  }

  const checkSvg = '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.2 2.2 4.8-5" stroke="#04130a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  PLAN.weeks.forEach(week=>{
    const el=document.createElement("div");
    el.className="week"; el.id="wk-"+week.n;

    const head=document.createElement("div");
    head.className="week-head";
    head.innerHTML=
      `<div class="week-num"><span style="display:flex;flex-direction:column;align-items:center;line-height:1"><span class="wk">НЕД</span>${week.n}</span></div>
       <div class="week-title"><h3>${esc(week.title)}</h3><p>${esc(week.focus)}</p></div>
       <div class="week-prog">
         <div data-wp="${week.n}">— / —</div>
         <div class="mini-bar"><div class="mini-fill" data-wf="${week.n}"></div></div>
       </div>
       <svg class="chev" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    el.appendChild(head);

    const body=document.createElement("div");
    body.className="week-body";

    week.days.forEach(day=>{
      if(day.rest){
        const r=document.createElement("div");
        r.className="rest";
        r.innerHTML=`<span class="day-tag">ДЕНЬ ${day.d}</span> Отдых — без матчасти. Это часть плана.`;
        body.appendChild(r);
        return;
      }
      const dEl=document.createElement("div");
      dEl.className="day";
      let tasksHtml="";
      day.items.forEach((it,i)=>{
        const id=tid(week.n,day.d,i);
        const isDone=done[id]?" done":"";
        const detail=it[2]?`<div class="task-detail">${esc(it[2])}</div>`:"";
        const hasDetail=it[2]?" has-detail":"";
        tasksHtml+=
          `<div class="task-row${hasDetail}">
             <div class="task${isDone}" data-id="${id}" data-w="${week.n}">
               <div class="check">${checkSvg}</div>
               <span class="tg tg-${it[0]} task-tg">${it[0]}</span>
               <span class="task-txt">${esc(it[1])}</span>
               ${it[2]?'<button class="task-more" aria-label="подробнее"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>':''}
             </div>
             ${detail}
           </div>`;
      });
      dEl.innerHTML=
        `<div class="day-head"><span class="day-tag">ДЕНЬ ${day.d}</span><span class="day-h">${esc(day.h)}</span></div>${tasksHtml}`;
      body.appendChild(dEl);
    });

    if(week.control){
      const c=document.createElement("div");
      c.className="control";
      c.innerHTML=`<b>Контроль недели.</b> ${esc(week.control)}`;
      body.appendChild(c);
    }

    el.appendChild(body);
    host.appendChild(el);

    head.addEventListener("click",()=>el.classList.toggle("open"));
  });

  // task toggling + detail expand (event delegation)
  host.addEventListener("click",e=>{
    // клик по кнопке "подробнее" — раскрыть/свернуть детали
    const more=e.target.closest(".task-more");
    if(more){
      e.stopPropagation();
      const row=more.closest(".task-row");
      if(row) row.classList.toggle("open");
      return;
    }
    // клик по задаче — отметить выполнение
    const t=e.target.closest(".task");
    if(!t) return;
    const id=t.dataset.id, w=parseInt(t.dataset.w,10);
    if(done[id]){ delete done[id]; t.classList.remove("done"); }
    else { done[id]=true; t.classList.add("done"); }
    persist();
    updateWeek(w);
    updateOverall();
  });

  function updateWeek(n){
    const week=PLAN.weeks.find(w=>w.n===n);
    const st=weekStats(week);
    const wp=document.querySelector(`[data-wp="${n}"]`);
    const wf=document.querySelector(`[data-wf="${n}"]`);
    if(wp) wp.innerHTML=`<span class="s">${st.ok}</span> / ${st.total}`;
    if(wf) wf.style.width=(st.total? Math.round(st.ok/st.total*100):0)+"%";
    const wkEl=document.getElementById("wk-"+n);
    if(wkEl) wkEl.classList.toggle("done", st.total>0 && st.ok===st.total);
  }

  function updateOverall(){
    let total=0, ok=0;
    PLAN.weeks.forEach(w=>{ const s=weekStats(w); total+=s.total; ok+=s.ok; });
    const pct=total?Math.round(ok/total*100):0;
    document.getElementById("overallPct").textContent=pct+"%";
    document.getElementById("overallBar").style.width=pct+"%";
    const hint=document.getElementById("dashHint");
    if(ok===0) hint.textContent="Отмечено задач по всей программе. Начни с Недели 1.";
    else if(pct===100) hint.textContent="Вся программа пройдена. Пора подаваться на вакансии — удачи.";
    else hint.textContent=`Выполнено ${ok} из ${total} задач. Двигайся в своём темпе — главное усвоение, а не срок.`;
  }

  // ---- extra blocks: quizzes + principles + after ----
  const extraHost=document.getElementById("extraHost");

  if(PLAN.quizzes && PLAN.quizzes.length){
    const qz=document.createElement("div");
    qz.className="extra";
    qz.innerHTML=`<h3>Бесплатные ресурсы для самопроверки</h3><ul class="res">${
      PLAN.quizzes.map(q=>`<li><a href="${esc(q[1])}" target="_blank" rel="noopener">${esc(q[0])}</a> — ${esc(q[2])}</li>`).join("")
    }</ul>`;
    extraHost.appendChild(qz);
  }

  const pr=document.createElement("div");
  pr.className="extra";
  pr.innerHTML=`<h3>Сквозные принципы</h3><ul>${PLAN.principles.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>`;
  extraHost.appendChild(pr);

  const af=document.createElement("div");
  af.className="extra";
  af.innerHTML=`<h3>После программы — куда расти</h3><ul>${PLAN.after.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>`;
  extraHost.appendChild(af);

  // ---- reset ----
  document.getElementById("resetBtn").addEventListener("click",()=>{
    if(confirm("Сбросить весь прогресс по программе?")){
      done={}; persist();
      document.querySelectorAll(".task.done").forEach(t=>t.classList.remove("done"));
      PLAN.weeks.forEach(w=>updateWeek(w.n));
      updateOverall();
      showToast("Прогресс сброшен");
    }
  });

  // ---- toast ----
  let tm;
  function showToast(m){
    const t=document.getElementById("toast");
    t.textContent=m; t.classList.add("show");
    clearTimeout(tm); tm=setTimeout(()=>t.classList.remove("show"),2400);
  }

  function esc(s){ return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

  // ---- init ----
  PLAN.weeks.forEach(w=>updateWeek(w.n));
  updateOverall();
  // open week 1 by default
  const first=document.getElementById("wk-1"); if(first) first.classList.add("open");
})();
