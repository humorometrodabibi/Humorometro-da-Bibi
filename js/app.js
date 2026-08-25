/* ============================================================
   app.js — página inicial (escolher humor + enviar)
   ============================================================ */

import { start, ouvirHumores, registrarHumor, salvarRecado, ouvirRegistros } from './cloud.js';
import {
  markActiveNav, showToast, escapeHtml, buildMediaEl, fmtDate, fmtTime,
} from './ui.js';

const grid     = document.getElementById('moodGrid');
const btnSend  = document.getElementById('btnSend');
const frame    = document.getElementById('stageFrame');
const caption  = document.getElementById('stageCaption');
const audio    = document.getElementById('moodAudio');
const overlay  = document.getElementById('msgOverlay');
const msgText  = document.getElementById('msgText');
const msgEmoji = document.getElementById('msgEmoji');
const lastNote = document.getElementById('lastNote');

let moods = [];
let selectedMoodId = null;
let currentRecordId = null;

markActiveNav();

/* Só roda depois do login autorizado */
start(() => {
  ouvirHumores(lista => { moods = lista; renderMoods(); });
  ouvirRegistros(updateLastNote);
});

/* ---------- Cartões de humor ---------- */
function renderMoods() {
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

  // mantém a seleção se o humor ainda existir
  if (selectedMoodId && moods.some(m => m.id === selectedMoodId)) selectMood(selectedMoodId);
  else { selectedMoodId = null; btnSend.disabled = true; }
}

function selectMood(id) {
  selectedMoodId = id;
  document.querySelectorAll('.mood-chip').forEach(c => {
    c.classList.toggle('is-selected', c.dataset.id === id);
  });
  btnSend.disabled = false;
}

/* ---------- Enviar ---------- */
btnSend.addEventListener('click', async () => {
  const mood = moods.find(m => m.id === selectedMoodId);
  if (!mood) return;

  btnSend.disabled = true;
  try {
    currentRecordId = await registrarHumor(mood);
  } catch (e) {
    showToast('Não consegui salvar o humor 😢');
    console.error(e);
    btnSend.disabled = false;
    return;
  }
  btnSend.disabled = false;

  showMedia(mood);
  playSound(mood);
  rainHearts(mood.emoji);
  frame.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => openModal(mood), 1300);
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

function playSound(mood) {
  audio.pause();
  if (!mood.sound || !mood.sound.value) return;
  audio.src = mood.sound.value;
  audio.currentTime = 0;
  audio.play().catch(err => console.warn('Som não pôde tocar:', err));
}

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

/* ---------- Modal do recadinho ---------- */
function openModal(mood) {
  msgEmoji.textContent = mood.emoji || '💌';
  msgText.value = '';
  overlay.hidden = false;
  setTimeout(() => msgText.focus(), 120);
}

function closeModal() { overlay.hidden = true; }

document.getElementById('msgSave').addEventListener('click', async () => {
  const txt = msgText.value.trim();
  closeModal();
  if (currentRecordId) {
    try { await salvarRecado(currentRecordId, txt); }
    catch (e) { showToast('Não consegui salvar o recadinho'); return; }
  }
  showToast(txt ? 'Recadinho enviado 💌' : 'Humor registrado ♡');
});

document.getElementById('msgSkip').addEventListener('click', () => {
  closeModal();
  showToast('Humor registrado ♡');
});

overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closeModal(); });

/* ---------- Último registro ---------- */
function updateLastNote(records) {
  if (!records.length) { lastNote.textContent = ''; return; }
  const r = records[0];
  lastNote.innerHTML =
    `último registro: <strong>${escapeHtml(r.moodName)}</strong> ${r.moodEmoji || ''} ` +
    `em ${fmtDate(r.at)} às ${fmtTime(r.at)} · ` +
    `<a href="historico.html" style="text-decoration:underline">ver histórico</a>`;
}
