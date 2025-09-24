// SPA Router + State
const app = document.getElementById('app');
const routes = {};
function route(path, handler){ routes[path] = handler; }
function parseHash(){
  const h = location.hash.slice(1) || '/';
  return h.split('/').filter(Boolean);
}
function navigate(path){ location.hash = path; }
window.addEventListener('hashchange', render);

// Storage
function saveLocal(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function loadLocal(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }catch{return d;} }

// Data Model
// decks: [{id, name, words:[{en,jp}], stats:{unknownCounts: number[], knownTotal, unknownTotal}}]
const state = {
  decks: loadLocal('decks', []),
  session: null, // {deckId, order, idx, showBack, known, unknown, size, dir, shuffle}
};

function persist(){ saveLocal('decks', state.decks); }
function uid(){ return Math.random().toString(36).slice(2,10); }
function getDeck(id){ return state.decks.find(d => d.id === id); }

// ---------- Pages ----------
route('/', ()=>{
  app.innerHTML = `
    <section class="panel grid">
      <div class="center">
        <button class="btn primary" id="newBtn">NEW</button>
        <a class="btn" href="#/lists">EXISTING</a>
      </div>
    </section>`;
  document.getElementById('newBtn').onclick = ()=> navigate('/new');
});

route('lists', ()=>{
  if (state.decks.length===0){
    app.innerHTML = `
      <section class="panel grid">
        <p>まだカードリストがありません。</p>
        <div class="center"><a class="btn primary" href="#/new">新規作成</a></div>
      </section>`;
    return;
  }
  const list = state.decks.map(d => {
    const unknownSum = (d.stats?.unknownCounts||[]).reduce((a,b)=>a+b,0);
    const warn = unknownSum >= 3 ? 'warn' : '';
    const known = d.stats?.knownTotal||0;
    const unknown = d.stats?.unknownTotal||0;
    return `<div class="item">
      <div>
        <div class="title">${escapeHtml(d.name)}</div>
        <div class="row" style="margin-top:6px;">
          <span class="tag ${warn}">まだまだ合計: ${unknownSum}</span>
          <span class="tag">覚えた: ${known}</span>
          <span class="tag">まだまだ: ${unknown}</span>
          <span class="tag">${d.words.length} 語</span>
        </div>
      </div>
      <div class="row">
        <a class="btn" href="#/words/${d.id}">words</a>
        <a class="btn" href="#/edit/${d.id}">edit</a>
        <a class="btn primary" href="#/prestart/${d.id}">start</a>
      </div>
    </div>`;
  }).join('');
  app.innerHTML = `<section class="panel grid">
    <h2 style="margin:0 0 8px 0;">カードリスト一覧</h2>
    <div class="list">${list}</div>
    <div class="center" style="margin-top:10px"><a class="btn" href="#/new">+ 新規作成</a></div>
  </section>`;
});

route('new', ()=>{
  app.innerHTML = `
  <section class="panel grid">
    <h2 style="margin:0;">新規カードリスト作成</h2>
    <label>リスト名</label>
    <input type="text" id="deckName" placeholder="例：中1 Unit1-3" />
    <label style="margin-top:8px;">単語リスト（1行1語：英語,日本語）</label>
    <textarea id="dataArea" placeholder="apple,りんご\nstudy,勉強する"></textarea>
    <div class="spaced">
      <button class="btn" id="loadSample">サンプル読込</button>
      <button class="btn primary" id="nextBtn">次へ</button>
    </div>
  </section>`;
  document.getElementById('loadSample').onclick = ()=>{
    document.getElementById('dataArea').value = `apple,りんご
study,勉強する
teacher,先生
friend,友だち
because,なぜなら
improve,改善する
remember,覚える
challenge,挑戦
success,成功
although,〜だけれども`;
  };
  document.getElementById('nextBtn').onclick = ()=>{
    const name = document.getElementById('deckName').value.trim() || 'My List';
    const text = document.getElementById('dataArea').value;
    const words = parseText(text);
    if (words.length===0){ alert('単語がありません'); return; }
    const id = uid();
    const deck = {id, name, words, stats:{unknownCounts:Array(words.length).fill(0), knownTotal:0, unknownTotal:0}};
    state.decks.push(deck); persist();
    navigate('/prestart/'+id);
  };
});

route('edit', (id)=>{
  const deck = getDeck(id); if (!deck){ navigate('/lists'); return; }
  app.innerHTML = `
  <section class="panel grid">
    <h2 style="margin:0;">リスト編集：${escapeHtml(deck.name)}</h2>
    <label>リスト名</label>
    <input type="text" id="deckName" value="${escapeAttr(deck.name)}" />
    <label style="margin-top:8px;">単語リスト（1行1語：英語,日本語）</label>
    <textarea id="dataArea">${escapeTextArea(deckToText(deck.words))}</textarea>
    <div class="spaced">
      <a class="btn" href="#/lists">戻る</a>
      <button class="btn primary" id="saveBtn">保存</button>
    </div>
  </section>`;
  document.getElementById('saveBtn').onclick = ()=>{
    deck.name = document.getElementById('deckName').value.trim() || deck.name;
    const words = parseText(document.getElementById('dataArea').value);
    if (words.length===0){ alert('単語が0件です'); return; }
    deck.words = words;
    // リサイズに合わせて unknownCounts も再生成
    deck.stats = deck.stats || {};
    deck.stats.unknownCounts = Array(words.length).fill(0);
    persist();
    alert('保存しました');
    navigate('/lists');
  };
});

route('prestart', (id)=>{
  const deck = getDeck(id); if (!deck){ navigate('/lists'); return; }
  app.innerHTML = `
    <section class="panel grid">
      <h2 style="margin:0;">学習開始</h2>
      <div class="row">
        <label>出題方向</label>
        <select id="dir"><option value="enjp">英→日</option><option value="jpen">日→英</option></select>
      </div>
      <div class="row">
        <label>セット数</label>
        <select id="size"><option>10</option><option>20</option><option>30</option><option>40</option><option>50</option></select>
      </div>
      <div class="row">
        <label><input id="shuffle" type="checkbox"> シャッフル</label>
      </div>
      <div class="spaced" style="margin-top:8px;">
        <a class="btn" href="#/lists">一覧に戻る</a>
        <button class="btn primary" id="startBtn">スタート</button>
      </div>
    </section>`;
  document.getElementById('startBtn').onclick = ()=>{
    const dir = document.getElementById('dir').value;
    const size = parseInt(document.getElementById('size').value,10);
    const shuffle = document.getElementById('shuffle').checked;
    startSession(id, {dir, size, shuffle});
    navigate('/study/'+id);
  };
});

route('study', (id)=>{
  const deck = getDeck(id); if (!deck || !state.session){ navigate('/prestart/'+id); return; }
  app.innerHTML = `
    <section class="study-wrap">
      <div class="progress"><div id="bar" class="bar"></div></div>
      <div class="card-scene">
        <div id="card" class="card">
          <div class="card-inner">
            <div id="front" class="face front"></div>
            <div id="back" class="face back"></div>
          </div>
          <div class="ghost-hint">右へ：覚えた / 左へ：まだまだ / タップで表裏</div>
        </div>
      </div>
      <div class="meta" id="meta"></div>
      <div class="center">
        <button class="btn" id="flipBtn">答えを見る</button>
      </div>
    </section>`;
  bindStudy();
  renderStudy();
});

route('result', (id)=>{
  const deck = getDeck(id); if (!deck || !state.session){ navigate('/lists'); return; }
  const s = state.session;
  app.innerHTML = `
    <section class="panel grid">
      <h2 style="margin:0;">結果</h2>
      <canvas id="pie" width="320" height="220"></canvas>
      <div class="row" style="justify-content:center">
        <div class="tag" style="border-color:#1e3b34;background:#0d1d19;color:#7fe8c8">覚えた ${s.known}</div>
        <div class="tag" style="border-color:#3b2d18;background:#241a0d;color:#ffd166">まだまだ ${s.unknown}</div>
      </div>
      <div class="center" style="margin-top:8px">
        <a class="btn" href="#/lists">一覧に戻る</a>
        <button id="nextBatch" class="btn primary">次へ</button>
      </div>
    </section>`;
  drawPie(document.getElementById('pie'), s.known, s.unknown);
  document.getElementById('nextBatch').onclick = ()=>{
    const deck = getDeck(id);
    const s = state.session;
    const seenSet = new Set(s.order.slice(0, s.size));
    const remaining = deck.words.map((_,i)=>i).filter(i=>!seenSet.has(i));
    const opts = {dir:s.dir, size:s.size, shuffle:s.shuffle};
    if (remaining.length > 0){
      startSession(id, opts, remaining);
    } else {
      startSession(id, opts);
    }
    navigate('/study/'+id);
  };
});

route('words', (id)=>{
  const deck = getDeck(id); if (!deck){ navigate('/lists'); return; }
  const rows = deck.words.map((w,i)=>{
    const u = deck.stats?.unknownCounts?.[i]||0;
    const mark = u>=3 ? 'style="background:#2a2414;border-color:#705b2b;color:#ffd166"' : '';
    return `<div class="item" ${mark}><div>${escapeHtml(w.en)}</div><div class="tag">まだまだ:${u}</div></div>`;
  }).join('');
  app.innerHTML = `
    <section class="panel grid">
      <h2 style="margin:0 0 8px 0;">${escapeHtml(deck.name)} の単語（英語のみ）</h2>
      <div class="list">${rows}</div>
      <div class="center" style="margin-top:8px">
        <a class="btn" href="#/lists">一覧に戻る</a>
        <a class="btn primary" href="#/prestart/${deck.id}">学習へ</a>
      </div>
    </section>`;
});

// ---------- Helpers ----------
function startSession(deckId, {dir,size,shuffle}, specificOrder=null){
  const deck = getDeck(deckId);
  let order = specificOrder ?? deck.words.map((_,i)=>i);
  if (shuffle){ shuffleArray(order); }
  order = order.slice(0, Math.min(size, order.length));
  state.session = {deckId, order, idx:0, showBack:false, known:0, unknown:0, size:order.length, dir, shuffle};
}

function currentCard(){
  const s = state.session; const deck = getDeck(s.deckId);
  const idx = s.order[s.idx];
  return {w: deck.words[idx], index: idx};
}

function renderStudy(){
  const s = state.session; const deck = getDeck(s.deckId);
  const {w} = currentCard();
  const front = s.dir==='enjp' ? w.en : w.jp;
  const back = s.dir==='enjp' ? w.jp : w.en;
  document.getElementById('front').textContent = front || '';
  document.getElementById('back').textContent = back || '';
  document.getElementById('meta').textContent = `${s.idx+1} / ${s.size}`;
  document.getElementById('bar').style.width = ((s.idx+1)/s.size*100)+'%';
  const card = document.getElementById('card');
  card.classList.remove('flip');
}

function nextCard(){
  const s = state.session;
  if (s.idx < s.size-1){
    s.idx++; s.showBack=false; renderStudy();
  } else {
    const deck = getDeck(s.deckId);
    deck.stats = deck.stats || {unknownCounts:Array(deck.words.length).fill(0), knownTotal:0, unknownTotal:0};
    deck.stats.knownTotal = (deck.stats.knownTotal||0) + s.known;
    deck.stats.unknownTotal = (deck.stats.unknownTotal||0) + s.unknown;
    persist();
    navigate('/result/'+s.deckId);
  }
}

function bindStudy(){
  const card = document.getElementById('card');
  const inner = card.querySelector('.card-inner');
  const flipBtn = document.getElementById('flipBtn');
  flipBtn.onclick = ()=>{ state.session.showBack=!state.session.showBack; card.classList.toggle('flip', state.session.showBack); };

  // Swipe handlers
  let startX=null,startY=null, dragging=false;
  function onStart(e){ const t=e.changedTouches?e.changedTouches[0]:e; startX=t.clientX; startY=t.clientY; dragging=true; }
  function onMove(e){
    if (!dragging) return;
    const t=e.changedTouches?e.changedTouches[0]:e;
    const dx=t.clientX-startX, dy=t.clientY-startY;
    if (Math.abs(dx)>Math.abs(dy)){
      card.style.transform = `translateX(${dx}px) rotate(${dx/25}deg)`;
      card.style.boxShadow = `0 16px 40px rgba(0,0,0,.4)`;
    }
  }
  function onEnd(e){
    if (!dragging) return;
    dragging=false;
    const t=e.changedTouches?e.changedTouches[0]:e;
    const dx=t.clientX-startX, dy=t.clientY-startY;
    card.style.transition = 'transform .25s ease, box-shadow .25s ease';
    const threshold = 80;
    if (Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>threshold){
      const right = dx>0;
      const off = right ? window.innerWidth : -window.innerWidth;
      card.style.transform = `translateX(${off}px) rotate(${dx/20}deg)`;
      setTimeout(()=>{
        card.style.transition=''; card.style.transform=''; card.style.boxShadow='';
        onSwipe(right);
      }, 180);
    } else {
      card.style.transform=''; card.style.boxShadow='';
    }
    setTimeout(()=>{card.style.transition='';}, 260);
  }
  card.addEventListener('touchstart', onStart, {passive:true});
  card.addEventListener('touchmove', onMove, {passive:true});
  card.addEventListener('touchend', onEnd, {passive:true});
  card.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  // Click flip
  card.addEventListener('click', (e)=>{
    if ((e.target.closest('button,select,input,textarea'))) return;
    state.session.showBack = !state.session.showBack;
    card.classList.toggle('flip', state.session.showBack);
  });
}

function onSwipe(right){
  const s = state.session; const deck = getDeck(s.deckId);
  const {index} = currentCard();
  if (right){
    s.known++;
  } else {
    s.unknown++;
    deck.stats = deck.stats || {unknownCounts:Array(deck.words.length).fill(0), knownTotal:0, unknownTotal:0};
    if (!deck.stats.unknownCounts) deck.stats.unknownCounts = Array(deck.words.length).fill(0);
    deck.stats.unknownCounts[index] = (deck.stats.unknownCounts[index]||0) + 1;
    persist();
  }
  nextCard();
}

// Parsing helpers
function parseText(text){
  if (!text) return [];
  // Normalize line breaks and commas (handle full-width comma '，' and Japanese comma '、')
  let t = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  t = t.replace(/，/g, ',').replace(/、/g, ',');
  const lines = t.split('\n').map(l=>l.trim()).filter(Boolean);
  const words = [];
  for (const line of lines){
    const [en, ...rest] = line.split(',');
    const jp = (rest.join(',') || '').trim();
    if (en && jp){ words.push({en:en.trim(), jp}); }
  }
  return words;
}
function deckToText(words){ return words.map(w=>`${w.en},${w.jp}`).join('\n'); }

// Pie chart (vanilla canvas)
function drawPie(canvas, known, unknown){
  const ctx = canvas.getContext('2d');
  const total = Math.max(1, known + unknown);
  const w = canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const cx=w/2, cy=h/2, r=Math.min(w,h)*0.35;
  const start=-Math.PI/2;
  const angles=[(known/total)*Math.PI*2,(unknown/total)*Math.PI*2];
  const colors=['#19ab90','#ffd166'];
  let a=start;
  for (let i=0;i<2;i++){
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,a,a+angles[i]);
    ctx.closePath();
    ctx.fillStyle=colors[i];
    ctx.fill();
    a+=angles[i];
  }
  // ring
  ctx.beginPath();
  ctx.arc(cx,cy,r*0.65,0,Math.PI*2);
  ctx.arc(cx,cy,r,0,Math.PI*2,true);
  ctx.fillStyle='rgba(11,16,20,0.92)';
  ctx.fill();

  // labels
  ctx.fillStyle='#9ac2b6'; ctx.font='16px system-ui';
  const kp = Math.round((known/total)*100);
  ctx.textAlign='center'; ctx.fillText(`覚えた ${kp}%`, cx, cy+6);
}

// Utils
function shuffleArray(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} }
function escapeHtml(s){ return (s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
function escapeTextArea(s){ return s.replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Router render
function render(){
  const parts = parseHash();
  if (parts.length===0) return routes['/']();
  if (parts.length===1){
    const key = parts[0]===''?'/':parts[0];
    if (routes[key]) return routes[key]();
  }
  const key = parts[0];
  const id = parts[1];
  if (routes[key]) return routes[key](id);
  routes['/']();
}

// PWA install
const installBtn = document.getElementById('installBtn');
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; installBtn?.classList.remove('hidden'); });
installBtn?.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; installBtn.classList.add('hidden'); });

if ('serviceWorker' in navigator){ window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js')); }

// Boot
render();
