/* ============================================================
   inputs.js — cadastro e edição dos humores (na nuvem)
   ============================================================ */

import {
  start, ouvirHumores, criarHumor, atualizarHumor, apagarHumor,
  criarHumoresSugeridos, importarDoNavegador, TINTS,
} from './cloud.js';
import {
  markActiveNav, showToast, escapeHtml, buildMediaEl, fileToDataURL,
} from './ui.js';

const EMOJI_SUGGESTIONS = ['😊','🥰','🥺','😴','😤','😰','🤒','🥳','🫠','😍','🙃','😭','🤗','🌷','✨'];

const el = id => document.getElementById(id);

let moods = [];
let editingId = null;
let mediaKind = 'url', soundKind = 'url';
let mediaDraft = null, soundDraft = null;
let pendingDelete = null;

markActiveNav();
buildPickers();
resetForm();

start(() => {
  ouvirHumores(lista => { moods = lista; renderList(); });
});

/* ---------- Seletores de emoji e cor ---------- */
function buildPickers() {
  const wrap = el('emojiSuggest');
  EMOJI_SUGGESTIONS.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emoji-pick';
    b.textContent = e;
    b.addEventListener('click', () => { el('fEmoji').value = e; });
    wrap.appendChild(b);
  });

  const sw = el('swatches');
  TINTS.forEach((c, i) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'swatch' + (i === 0 ? ' is-on' : '');
    s.style.background = c;
    s.dataset.color = c;
    s.addEventListener('click', () => {
      sw.querySelectorAll('.swatch').forEach(x => x.classList.remove('is-on'));
      s.classList.add('is-on');
    });
    sw.appendChild(s);
  });
}

function selectedTint() {
  const on = el('swatches').querySelector('.swatch.is-on');
  return on ? on.dataset.color : TINTS[0];
}

function setTint(color) {
  const swatches = el('swatches').querySelectorAll('.swatch');
  let found = false;
  swatches.forEach(s => {
    const match = s.dataset.color === color;
    s.classList.toggle('is-on', match);
    if (match) found = true;
  });
  if (!found && swatches[0]) swatches[0].classList.add('is-on');
}

/* ---------- Link / Arquivo ---------- */
function wireSeg(segId, onChange) {
  el(segId).querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      el(segId).querySelectorAll('button').forEach(x => x.classList.remove('is-on'));
      b.classList.add('is-on');
      onChange(b.dataset.kind);
    });
  });
}

wireSeg('segMedia', kind => {
  mediaKind = kind;
  el('mediaUrlWrap').hidden = kind !== 'url';
  el('mediaFileWrap').hidden = kind !== 'file';
  renderPreview();
});

wireSeg('segSound', kind => {
  soundKind = kind;
  el('soundUrlWrap').hidden = kind !== 'url';
  el('soundFileWrap').hidden = kind !== 'file';
});

function setSegActive(segId, kind) {
  el(segId).querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.kind === kind));
}

/* ---------- Prévia ---------- */
function guessType(value, mime) {
  if (mime && mime.startsWith('video')) return 'video';
  if (/\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(value || '')) return 'video';
  return 'image';
}

function currentMediaDraft() {
  if (mediaKind === 'url') {
    const v = el('fMediaUrl').value.trim();
    return v ? { kind: 'url', type: guessType(v), value: v } : null;
  }
  return mediaDraft;
}

function currentSoundDraft() {
  if (soundKind === 'url') {
    const v = el('fSoundUrl').value.trim();
    return v ? { kind: 'url', value: v, name: 'link' } : null;
  }
  return soundDraft;
}

function renderPreview() {
  const box = el('mediaPreview');
  box.innerHTML = '';
  const node = buildMediaEl(currentMediaDraft());
  if (node) box.appendChild(node);
  else box.innerHTML = '<span class="placeholder">a prévia aparece aqui</span>';
}

el('fMediaUrl').addEventListener('input', renderPreview);

el('fMediaFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 900 * 1024) {
    showToast('Arquivo grande demais para a nuvem. Use um link (URL).');
    e.target.value = '';
    return;
  }
  mediaDraft = { kind: 'file', type: guessType(f.name, f.type), value: await fileToDataURL(f), name: f.name };
  renderPreview();
});

el('fSoundFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 700 * 1024) {
    showToast('Áudio grande demais para a nuvem. Use um link (URL).');
    e.target.value = '';
    return;
  }
  soundDraft = { kind: 'file', value: await fileToDataURL(f), name: f.name };
  el('soundName').textContent = f.name;
});

el('btnTestSound').addEventListener('click', () => {
  const s = currentSoundDraft();
  if (!s || !s.value) { showToast('Nenhum som escolhido ainda'); return; }
  const a = el('testAudio');
  a.src = s.value; a.currentTime = 0;
  a.play().catch(() => showToast('Não consegui tocar esse som'));
});

/* ---------- Salvar ---------- */
el('btnSave').addEventListener('click', async () => {
  const name = el('fName').value.trim();
  if (!name) { showToast('Dá um nome pro humor ♡'); el('fName').focus(); return; }

  const payload = {
    name,
    emoji: el('fEmoji').value.trim() || '💗',
    tint: selectedTint(),
    media: currentMediaDraft(),
    sound: currentSoundDraft(),
  };

  el('btnSave').disabled = true;
  try {
    if (editingId) {
      await atualizarHumor(editingId, payload);
      showToast('Humor atualizado ✨');
    } else {
      await criarHumor({ ...payload, order: moods.length });
      showToast('Humor criado 💗');
    }
    resetForm();
  } catch (e) {
    console.error(e);
    showToast('Não consegui salvar. Confira as regras do banco.');
  }
  el('btnSave').disabled = false;
});

/* ---------- Formulário ---------- */
function resetForm() {
  editingId = null;
  mediaDraft = null; soundDraft = null;
  mediaKind = 'url'; soundKind = 'url';
  setSegActive('segMedia', 'url'); setSegActive('segSound', 'url');
  el('mediaUrlWrap').hidden = false; el('mediaFileWrap').hidden = true;
  el('soundUrlWrap').hidden = false; el('soundFileWrap').hidden = true;
  el('fName').value = '';
  el('fEmoji').value = '';
  el('fMediaUrl').value = '';
  el('fSoundUrl').value = '';
  el('fMediaFile').value = '';
  el('fSoundFile').value = '';
  el('soundName').textContent = '';
  setTint(TINTS[0]);
  el('formTitle').textContent = 'Novo humor';
  el('formSub').textContent = 'Preencha os campos e salve. Depois é só editar quando quiser.';
  el('btnReset').hidden = true;
  renderPreview();
}

el('btnReset').addEventListener('click', resetForm);

function startEdit(id) {
  const m = moods.find(x => x.id === id);
  if (!m) return;
  editingId = id;
  el('fName').value = m.name;
  el('fEmoji').value = m.emoji || '';
  setTint(m.tint);

  if (m.media && m.media.kind === 'url') {
    mediaKind = 'url'; setSegActive('segMedia', 'url');
    el('mediaUrlWrap').hidden = false; el('mediaFileWrap').hidden = true;
    el('fMediaUrl').value = m.media.value; mediaDraft = null;
  } else if (m.media) {
    mediaKind = 'file'; setSegActive('segMedia', 'file');
    el('mediaUrlWrap').hidden = true; el('mediaFileWrap').hidden = false;
    el('fMediaUrl').value = ''; mediaDraft = m.media;
  } else {
    mediaKind = 'url'; setSegActive('segMedia', 'url');
    el('mediaUrlWrap').hidden = false; el('mediaFileWrap').hidden = true;
    el('fMediaUrl').value = ''; mediaDraft = null;
  }

  if (m.sound && m.sound.kind === 'url') {
    soundKind = 'url'; setSegActive('segSound', 'url');
    el('soundUrlWrap').hidden = false; el('soundFileWrap').hidden = true;
    el('fSoundUrl').value = m.sound.value; soundDraft = null;
    el('soundName').textContent = '';
  } else if (m.sound) {
    soundKind = 'file'; setSegActive('segSound', 'file');
    el('soundUrlWrap').hidden = true; el('soundFileWrap').hidden = false;
    soundDraft = m.sound;
    el('soundName').textContent = m.sound.name || 'arquivo salvo';
  } else {
    soundKind = 'url'; setSegActive('segSound', 'url');
    el('soundUrlWrap').hidden = false; el('soundFileWrap').hidden = true;
    el('fSoundUrl').value = ''; soundDraft = null; el('soundName').textContent = '';
  }

  el('formTitle').textContent = `Editando “${m.name}”`;
  el('formSub').textContent = 'Altere o que quiser e salve. Ou cancele a edição.';
  el('btnReset').hidden = false;
  renderPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Lista ---------- */
function renderList() {
  const list = el('moodList');
  list.innerHTML = '';
  el('countSub').textContent = moods.length
    ? `${moods.length} humor${moods.length > 1 ? 'es' : ''} disponíve${moods.length > 1 ? 'is' : 'l'} para vocês dois.`
    : 'Nenhum humor ainda.';

  if (!moods.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="big">🌸</span>
        Sua lista está vaziazinha.<br>
        <button class="btn btn-sm" id="btnSeed" style="margin-top:14px">Criar os 6 humores sugeridos</button>
      </div>`;
    el('btnSeed').addEventListener('click', async e => {
      e.target.disabled = true;
      try { await criarHumoresSugeridos(); showToast('Prontinho 💗'); }
      catch (err) { showToast('Não consegui criar'); console.error(err); }
    });
    return;
  }

  moods.forEach(m => {
    const row = document.createElement('div');
    row.className = 'mood-row';
    row.style.setProperty('--tint', m.tint);

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const node = buildMediaEl(m.media, { cover: true });
    if (node) { if (node.tagName === 'VIDEO') node.muted = true; thumb.appendChild(node); }
    else thumb.textContent = m.emoji || '💗';

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `
      <strong>${m.emoji || ''} ${escapeHtml(m.name)}</strong>
      <div class="tags">
        <span class="tag ${m.media ? 'ok' : 'off'}">${m.media ? (m.media.type === 'video' ? 'vídeo ✓' : 'imagem ✓') : 'sem mídia'}</span>
        <span class="tag ${m.sound ? 'ok' : 'off'}">${m.sound ? 'som ✓' : 'sem som'}</span>
      </div>`;

    const actions = document.createElement('div');
    actions.className = 'row-inline';

    if (m.sound) {
      const play = document.createElement('button');
      play.className = 'btn btn-sm btn-ghost';
      play.textContent = '▶';
      play.title = 'Ouvir o som';
      play.addEventListener('click', () => {
        const a = el('testAudio');
        a.src = m.sound.value; a.currentTime = 0;
        a.play().catch(() => showToast('Não consegui tocar esse som'));
      });
      actions.appendChild(play);
    }

    const edit = document.createElement('button');
    edit.className = 'btn btn-sm';
    edit.textContent = 'Editar';
    edit.addEventListener('click', () => startEdit(m.id));

    const del = document.createElement('button');
    del.className = 'btn btn-sm btn-danger';
    del.textContent = 'Apagar';
    del.addEventListener('click', () => askDelete(m));

    actions.append(edit, del);
    row.append(thumb, info, actions);
    list.appendChild(row);
  });
}

/* ---------- Apagar ---------- */
function askDelete(mood) {
  pendingDelete = mood.id;
  el('confirmTitle').textContent = `Apagar “${mood.name}”?`;
  el('confirmText').textContent = 'O humor some para vocês dois. Os registros antigos no histórico continuam salvos.';
  el('confirmOverlay').hidden = false;
}

el('confirmNo').addEventListener('click', () => { pendingDelete = null; el('confirmOverlay').hidden = true; });

el('confirmYes').addEventListener('click', async () => {
  if (pendingDelete) {
    try {
      await apagarHumor(pendingDelete);
      if (editingId === pendingDelete) resetForm();
      showToast('Humor apagado');
    } catch (e) { showToast('Não consegui apagar'); console.error(e); }
  }
  pendingDelete = null;
  el('confirmOverlay').hidden = true;
});

/* ---------- Trazer dados antigos deste navegador ---------- */
el('btnImportLocal').addEventListener('click', async () => {
  const temAntigos = localStorage.getItem('humorometro.moods.v1');
  if (!temAntigos) { showToast('Não achei dados antigos neste navegador'); return; }
  el('btnImportLocal').disabled = true;
  try {
    const n = await importarDoNavegador();
    showToast(`${n} itens enviados para a nuvem ✨`);
  } catch (e) {
    showToast('Não consegui importar');
    console.error(e);
  }
  el('btnImportLocal').disabled = false;
});
