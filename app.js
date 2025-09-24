// MyStudy Custom - Flashcards PWA

const els = {

  direction: document.getElementById('direction'),

  setSize: document.getElementById('setSize'),

  shuffle: document.getElementById('shuffle'),

  startBtn: document.getElementById('startBtn'),

  card: document.getElementById('card'),

  front: document.getElementById('front'),

  back: document.getElementById('back'),

  bar: document.getElementById('bar'),

  meta: document.getElementById('meta'),

  showBtn: document.getElementById('showBtn'),

  nextBtn: document.getElementById('nextBtn'),

  resetBtn: document.getElementById('resetBtn'),

  installBtn: document.getElementById('installBtn'),

  dataArea: document.getElementById('dataArea'),

  loadSample: document.getElementById('loadSample'),

  saveData: document.getElementById('saveData'),

  exportData: document.getElementById('exportData'),

  knownCount: document.getElementById('knownCount'),

  unknownCount: document.getElementById('unknownCount'),

};



const state = {

  deck: [], // [{en,jp}]

  order: [],

  idx: 0,

  showBack: false,

  known: 0,

  unknown: 0,

  sessionSize: 10,

};



// ----- Storage helpers -----

function saveLocal(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function loadLocal(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def; } catch{ return def; } }



// ----- Data handling -----

function parseTextToDeck(text){

  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);

  const deck = [];

  for(const line of lines){

    const parts = line.split(',');

    if (parts.length>=2){

      deck.push({en: parts[0].trim(), jp: parts.slice(1).join(',').trim()});

    }

  }

  return deck;

}



function deckToText(deck){

  return deck.map(w => `${w.en},${w.jp}`).join('\n');

}



function loadDeck(){

  let deck = loadLocal('deck', null);

  if (!deck){

    // fallback: fetch words.json if exists

    deck = loadLocal('wordsCache', null);

  }

  if (!deck){ deck = []; }

  state.deck = deck;

  els.dataArea.value = deckToText(deck);

}



function saveDeckFromEditor(){

  const deck = parseTextToDeck(els.dataArea.value);

  state.deck = deck;

  saveLocal('deck', deck);

  saveLocal('wordsCache', deck);

  alert(`保存しました（${deck.length}語）`);

}



// ----- Session handling -----

function startSession(){

  const N = parseInt(els.setSize.value, 10);

  state.sessionSize = Math.min(N, state.deck.length);

  state.order = [...Array(state.deck.length).keys()];

  if (els.shuffle.checked){ shuffle(state.order); }

  state.order = state.order.slice(0, state.sessionSize);

  state.idx = 0;

  state.showBack = false;

  state.known = 0; state.unknown = 0;

  render();

}



function current(){

  const idx = state.order[state.idx];

  return state.deck[idx] || {en:'', jp:''};

}



function render(){

  const w = current();

  const dir = els.direction.value; // enjp or jpen

  const frontText = dir==='enjp' ? w.en : w.jp;

  const backText  = dir==='enjp' ? w.jp : w.en;

  els.front.textContent = frontText || 'デッキが空です。下のエディタで単語を追加してください。';

  els.back.textContent = backText || '';

  els.back.classList.toggle('hidden', !state.showBack);

  const p = state.sessionSize ? ((state.idx+1)/state.sessionSize)*100 : 0;

  els.bar.style.width = p + '%';

  els.meta.textContent = state.sessionSize ? `${state.idx+1} / ${state.sessionSize}` : '0 / 0';

  els.knownCount.textContent = state.known;

  els.unknownCount.textContent = state.unknown;

  els.showBtn.textContent = state.showBack ? '表に戻す' : '答えを見る';

}



function next(){

  if (state.idx < state.sessionSize-1){

    state.idx++;

    state.showBack = false;

    render();

  } else {

    els.front.textContent = 'おつかれさま！セット完了。';

    els.back.classList.add('hidden');

  }

}



function markKnown(){ state.known++; next(); }

function markUnknown(){ state.unknown++; next(); }



function toggleShow(){ state.showBack = !state.showBack; render(); }



// ----- Utils -----

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }



// ----- Swipe gestures -----

let startX = null; let startY = null;

function onTouchStart(e){ const t = e.changedTouches[0]; startX=t.clientX; startY=t.clientY; }

function onTouchEnd(e){

  if (startX===null) return;

  const t = e.changedTouches[0];

  const dx = t.clientX - startX;

  const dy = t.clientY - startY;

  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40){

    if (dx > 0){ // right

      markKnown();

    } else { // left

      markUnknown();

    }

  } else {

    // tap-ish -> flip

    toggleShow();

  }

  startX = startY = null;

}



// ----- Events -----

els.startBtn.addEventListener('click', startSession);

els.showBtn.addEventListener('click', toggleShow);

els.nextBtn.addEventListener('click', next);

els.resetBtn.addEventListener('click', ()=>{ localStorage.removeItem('idx'); state.idx=0; state.known=0; state.unknown=0; render(); });



els.loadSample.addEventListener('click', ()=>{

  els.dataArea.value = `apple,りんご\nstudy,勉強する\nteacher,先生\nfriend,友だち\nbecause,なぜなら\nalthough,〜だけれども\nimprove,改善する\nremember,覚える\nchallenge,挑戦\nsuccess,成功`;

});

els.saveData.addEventListener('click', saveDeckFromEditor);

els.exportData.addEventListener('click', ()=>{

  const blob = new Blob([deckToText(state.deck)], {type:'text/plain'});

  const a = document.createElement('a');

  a.href = URL.createObjectURL(blob);

  a.download = 'words.txt';

  a.click();

});



els.card.addEventListener('touchstart', onTouchStart, {passive:true});

els.card.addEventListener('touchend', onTouchEnd, {passive:true});

els.card.addEventListener('click', (e)=>{

  if (e.target.closest('button,select,input,summary,textarea')) return;

  toggleShow();

});



// PWA install prompt

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {

  e.preventDefault(); deferredPrompt = e; els.installBtn.classList.remove('hidden');

});

els.installBtn.addEventListener('click', async () => {

  if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; els.installBtn.classList.add('hidden');

});



// Service worker

if ('serviceWorker' in navigator){ window.addEventListener('load', ()=> navigator.serviceWorker.register('sw.js')); }



// Init

loadDeck();

render();

