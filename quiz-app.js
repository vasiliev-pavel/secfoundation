/* ============================================================
   SEC//FOUNDATION — логика приложения
   ============================================================ */
(function(){
  "use strict";
  const STORE_KEY = "secfoundation_progress_v1";
  const host = document.getElementById("blockHost");

  // state: { "B1": { "B1-0": {answered:true, correctFirst:true}, ... } }
  let state = load();

  function load(){
    try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch(e){ return {}; }
  }
  function save(){
    try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
  }

  // total questions
  let totalQ = 0;
  QUIZ.forEach(b => totalQ += b.questions.length);
  document.getElementById("totalQ").textContent = totalQ;

  const letters = ["A","B","C","D","E","F"];

  // ---- render blocks ----
  QUIZ.forEach((block, bi) => {
    const el = document.createElement("div");
    el.className = "block";
    el.id = "blk-"+block.id;

    const head = document.createElement("div");
    head.className = "block-head";
    head.innerHTML =
      `<div class="block-num">${bi+1}</div>
       <div class="block-title">
         <h3>${block.title}</h3>
         <p>${block.desc}</p>
       </div>
       <div class="block-stat" data-stat="${block.id}">— / ${block.questions.length}</div>
       <svg class="chev" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    el.appendChild(head);

    const body = document.createElement("div");
    body.className = "block-body";

    block.questions.forEach((qq, qi) => {
      const qid = block.id + "-" + qi;
      const qEl = document.createElement("div");
      qEl.className = "q";
      qEl.dataset.qid = qid;

      const codeHtml = qq.code ? `<pre style="background:var(--panel-2);padding:10px 13px;border-radius:7px;overflow:auto;margin:6px 0 10px;font-size:13px;color:var(--warn)">${esc(qq.code)}</pre>` : "";

      let optsHtml = "";
      qq.opts.forEach((opt, oi) => {
        optsHtml += `<button class="opt" data-oi="${oi}">
            <span class="key">${letters[oi]}</span>
            <span class="lbl">${esc(opt)}</span>
          </button>`;
      });

      qEl.innerHTML =
        `<div class="q-tag"><span class="id">${qid}</span><span class="cat">${esc(qq.cat)}</span></div>
         <div class="q-text">${qq.q}</div>
         ${codeHtml}
         <div class="opts">${optsHtml}</div>
         <div class="explain"><b>Разбор.</b> ${qq.exp}</div>`;

      body.appendChild(qEl);

      // attach handlers
      const optButtons = qEl.querySelectorAll(".opt");
      optButtons.forEach(btn => {
        btn.addEventListener("click", () => handleAnswer(block, qi, qid, btn, optButtons, qEl));
      });

      // restore answered state
      const rec = state[block.id] && state[block.id][qid];
      if(rec && rec.answered){
        replayAnswered(qq, optButtons, qEl, rec);
      }
    });

    // block footer
    const foot = document.createElement("div");
    foot.className = "block-foot";
    foot.innerHTML =
      `<span class="score-pill" data-score="${block.id}"></span>
       <button class="btn" data-retry="${block.id}">пройти блок заново</button>`;
    body.appendChild(foot);

    el.appendChild(body);
    host.appendChild(el);

    // toggle open/close
    head.addEventListener("click", () => {
      el.classList.toggle("open");
    });

    // retry handler
    foot.querySelector("[data-retry]").addEventListener("click", (e) => {
      e.stopPropagation();
      retryBlock(block);
    });
  });

  // ---- answer handling ----
  function handleAnswer(block, qi, qid, btn, optButtons, qEl){
    if(state[block.id] && state[block.id][qid] && state[block.id][qid].answered) return; // already answered
    const qq = block.questions[qi];
    const chosen = parseInt(btn.dataset.oi,10);
    const correct = qq.a;
    const isRight = chosen === correct;

    optButtons.forEach(b => {
      b.disabled = true;
      const oi = parseInt(b.dataset.oi,10);
      if(oi === correct) b.classList.add("correct");
      else if(oi === chosen) b.classList.add("wrong");
      else b.classList.add("dim");
    });

    const exp = qEl.querySelector(".explain");
    exp.classList.add("show");
    if(!isRight) exp.classList.add("was-wrong");

    // save
    if(!state[block.id]) state[block.id] = {};
    state[block.id][qid] = { answered:true, correctFirst:isRight };
    save();

    updateBlockStat(block);
    updateOverall();
  }

  function replayAnswered(qq, optButtons, qEl, rec){
    optButtons.forEach(b => {
      b.disabled = true;
      const oi = parseInt(b.dataset.oi,10);
      if(oi === qq.a) b.classList.add("correct");
      else b.classList.add("dim");
    });
    const exp = qEl.querySelector(".explain");
    exp.classList.add("show");
    if(!rec.correctFirst) exp.classList.add("was-wrong");
  }

  function retryBlock(block){
    if(state[block.id]) { delete state[block.id]; save(); }
    const blkEl = document.getElementById("blk-"+block.id);
    blkEl.querySelectorAll(".q").forEach(qEl => {
      qEl.querySelectorAll(".opt").forEach(b => {
        b.disabled = false;
        b.classList.remove("correct","wrong","dim");
      });
      const exp = qEl.querySelector(".explain");
      exp.classList.remove("show","was-wrong");
    });
    updateBlockStat(block);
    updateOverall();
    showToast("Блок «"+block.title+"» сброшен — проходи заново");
  }

  // ---- stats ----
  function blockScore(block){
    const rec = state[block.id] || {};
    let answered = 0, right = 0;
    block.questions.forEach((qq,qi) => {
      const r = rec[block.id+"-"+qi];
      if(r && r.answered){ answered++; if(r.correctFirst) right++; }
    });
    return { answered, right, total: block.questions.length };
  }

  function updateBlockStat(block){
    const sc = blockScore(block);
    const statEl = document.querySelector(`[data-stat="${block.id}"]`);
    if(statEl) statEl.innerHTML = `<span class="s">${sc.right}</span> / ${sc.total}`;

    const scoreEl = document.querySelector(`[data-score="${block.id}"]`);
    if(scoreEl){
      if(sc.answered === 0){
        scoreEl.innerHTML = `пока не отвечал · ${sc.total} вопросов`;
      } else if(sc.answered < sc.total){
        scoreEl.innerHTML = `отвечено ${sc.answered}/${sc.total} · верно <b>${sc.right}</b>`;
      } else {
        const pct = Math.round(sc.right/sc.total*100);
        let mark = pct===100 ? "идеально" : pct>=80 ? "хорошо" : pct>=60 ? "норм, повтори слабые места" : "стоит пройти блок ещё раз";
        scoreEl.innerHTML = `блок пройден · верно с первой попытки <b>${sc.right}/${sc.total}</b> (${pct}%) · ${mark}`;
      }
    }

    const blkEl = document.getElementById("blk-"+block.id);
    if(blkEl) blkEl.classList.toggle("done", sc.answered === sc.total && sc.total>0);
  }

  function updateOverall(){
    let right = 0;
    QUIZ.forEach(b => { right += blockScore(b).right; });
    const pct = Math.round(right/totalQ*100);
    document.getElementById("overallPct").textContent = pct+"%";
    document.getElementById("overallBar").style.width = pct+"%";
    const hint = document.getElementById("dashHint");
    if(right===0) hint.textContent = "Отвечено правильно с первой попытки — по всем блокам.";
    else if(pct===100) hint.textContent = "Весь фундамент закрыт на 100%. Можно переходить к практике на тренажёрах.";
    else hint.textContent = `Верно с первой попытки: ${right} из ${totalQ}. Продолжай — слабые блоки можно перепройти.`;
  }

  // ---- reset all ----
  document.getElementById("resetBtn").addEventListener("click", () => {
    if(confirm("Сбросить весь прогресс по всем блокам?")){
      state = {}; save();
      QUIZ.forEach(block => {
        const blkEl = document.getElementById("blk-"+block.id);
        blkEl.querySelectorAll(".q").forEach(qEl => {
          qEl.querySelectorAll(".opt").forEach(b => { b.disabled=false; b.classList.remove("correct","wrong","dim"); });
          qEl.querySelector(".explain").classList.remove("show","was-wrong");
        });
        updateBlockStat(block);
      });
      updateOverall();
      showToast("Весь прогресс сброшен");
    }
  });

  // ---- toast ----
  let toastTimer;
  function showToast(msg){
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>t.classList.remove("show"), 2600);
  }

  function esc(s){ return String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

  // ---- init ----
  QUIZ.forEach(updateBlockStat);
  updateOverall();
})();
