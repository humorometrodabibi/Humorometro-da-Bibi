/* ============================================================
   app.js — página inicial (escolher humor + enviar)
   ============================================================ */

let selectedMoodId = null;
let currentRecordId = null;

const grid       = document.getElementById('moodGrid');
const btnSend    = document.getElementById('btnSend');
const frame      = document.getElementById('stageFrame');
const caption    = document.getElementById('stageCaption');
const audio      = document.getElementById('moodAudio');
const overlay    = document.getElementById('msgOverlay');
const msgText    = document.getElementById('msgText');
const msgEmoji   = document.getElementById('msgEmoji');
const lastNote   = document.getElementById('lastNote');

/* ---------- Desenha os cartões de humor ---------- */
function renderMoods() {
  const moods = Store.getMoods();
  grid.innerHTML = '';

  if (!moods.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <span class="big">🎀</span>
        Nenhum humor cadastrado ainda.<br>
        <a class="btn btn-sm" style="margin-top:14px" href="inputs.html">Cadastrar em Inputs</a>
      </div>`;
    btnSend.disabled = true;
    return;
  }

  moods.forEach(mood => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'mood-chip';
    chip.style.setProperty('--tint', mood.tint);
    chip.dataset.id = mood.id;
    chip.innerHTML = `
      <span class="tick">✓</span>
      <span class="emoji">${mood.emoji || '💗'}</span>
      <span class="name">${escapeHtml(mood.name)}</span>`;
    chip.addEventListener('click', () => selectMood(mood.id));
    grid.appendChild(chip);
  });
}

function selectMood(id) {
  selectedMoodId = id;
  document.querySelectorAll('.mood-chip').forEach(c => {
    c.classList.toggle('is-selected', c.dataset.id === id);
  });
  btnSend.disabled = false;
}

/* ---------- Enviar ---------- */
btnSend.addEventListener('click', () => {
  const mood = Store.getMood(selectedMoodId);
  if (!mood) return;

  const rec = Store.addRecord(mood);
  currentRecordId = rec ? rec.id : null;

  showMedia(mood);
  playSound(mood);
  rainHearts(mood.emoji);

  // Modal entra depois da animação da mídia
  setTimeout(() => openModal(mood), 1300);

  frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updateLastNote();
});

/* ---------- Mídia ---------- */
function showMedia(mood) {
  frame.innerHTML = '';
  frame.classList.remove('is-empty');

  const box = document.createElement('div');
  box.className = 'stage-media pop-in';

  const el = buildMediaEl(mood.media);
  if (el) {
    box.appendChild(el);
  } else {
    box.innerHTML = `
      <div class="stage-empty">
        <span class="big">${mood.emoji || '💗'}</span>
        <strong>${escapeHtml(mood.name)}</strong><br>
        Ainda não tem gif, imagem ou vídeo para este humor.<br>
        <a class="btn btn-sm" style="margin-top:14px" href="inputs.html">Cadastrar em Inputs</a>
      </div>`;
  }
  frame.appendChild(box);

  caption.hidden = false;
  caption.textContent = `hoje você está ${mood.name.toLowerCase()} ${mood.emoji || ''}`;
}

/* ---------- Som ---------- */
function playSound(mood) {
  audio.pause();
  if (!mood.sound || !mood.sound.value) return;
  audio.src = mood.sound.value;
  audio.currentTime = 0;
  audio.play().catch(err => console.warn('Som não pôde tocar:', err));
}

/* ---------- Chuvinha de coraçõezinhos ---------- */
function rainHearts(emoji) {
  const layer = document.createElement('div');
  layer.className = 'confetti';
  const pool = [emoji || '💗', '💗', '✨', '⭐', '🩷'];
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('span');
    s.textContent = pool[i % pool.length];
    s.style.left = (Math.random() * 96) + '%';
    s.style.animationDelay = (Math.random() * 1.4).toFixed(2) + 's';
    s.style.animationDuration = (2.6 + Math.random() * 1.8).toFixed(2) + 's';
    s.style.fontSize = (14 + Math.random() * 18).toFixed(0) + 'px';
    layer.appendChild(s);
  }
  frame.appendChild(layer);
  setTimeout(() => layer.remove(), 5000);
}

/* ---------- Modal da mensagem ---------- */
function openModal(mood) {
  msgEmoji.textContent = mood.emoji || '💌';
  msgText.value = '';
  overlay.hidden = false;
  setTimeout(() => msgText.focus(), 120);
}

function closeModal() { overlay.hidden = true; }

document.getElementById('msgSave').addEventListener('click', () => {
  const txt = msgText.value.trim();
  if (currentRecordId) Store.setRecordMessage(currentRecordId, txt);
  closeModal();
  showToast(txt ? 'Recadinho guardado 💌' : 'Humor registrado ♡');
  updateLastNote();
});

document.getElementById('msgSkip').addEventListener('click', () => {
  closeModal();
  showToast('Humor registrado ♡');
});

overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closeModal(); });

/* ---------- Rodapé com o último registro ---------- */
function updateLastNote() {
  const recs = Store.getRecords();
  if (!recs.length) { lastNote.textContent = ''; return; }
  const r = recs[0];
  lastNote.innerHTML = `último registro: <strong>${escapeHtml(r.moodName)}</strong> ${r.moodEmoji || ''} em ${fmtDate(r.at)} às ${fmtTime(r.at)} · <a href="historico.html" style="text-decoration:underline">ver histórico</a>`;
}

/* ---------- Segurança básica de texto ---------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ---------- Início ---------- */
markActiveNav();
renderMoods();
updateLastNote();
