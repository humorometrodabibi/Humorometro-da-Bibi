/* ============================================================
   inputs.js — cadastro e edição dos humores
   ============================================================ */

const EMOJI_SUGGESTIONS = ['😊','🥰','🥺','😴','😤','😰','🤒','🥳','🫠','😍','🙃','😭','🤗','🌷','✨'];

let editingId = null;                       // id do humor sendo editado (null = novo)
let mediaKind = 'url', soundKind = 'url';   // modo escolhido nos botões
let mediaDraft = null, soundDraft = null;   // objetos temporários antes de salvar
let pendingDelete = null;

const el = id => document.getElementById(id);

/* ---------- Sugestões de emoji e cores ---------- */
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
  Store.TINTS.forEach((c, i) => {
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
  return on ? on.dataset.color : Store.TINTS[0];
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

/* ---------- Alternância Link / Arquivo ---------- */
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
});

wireSeg('segSound', kind => {
  soundKind = kind;
  el('soundUrlWrap').hidden = kind !== 'url';
  el('soundFileWrap').hidden = kind !== 'file';
});

function setSegActive(segId, kind) {
  el(segId).querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.kind === kind));
}

/* ---------- Tipo de mídia a partir da URL / arquivo ---------- */
function guessType(value, mime) {
  if (mime && mime.startsWith('video')) return 'video';
  if (/\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(value || '')) return 'video';
  return 'image';
}

/* ---------- Prévia ---------- */
function renderPreview() {
  const box = el('mediaPreview');
  box.innerHTML = '';
  const media = currentMediaDraft();
  const node = buildMediaEl(media);
  if (node) box.appendChild(node);
  else box.innerHTML = '<span class="placeholder">a prévia aparece aqui</span>';
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

el('fMediaUrl').addEventListener('input', renderPreview);

el('fMediaFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 3 * 1024 * 1024) {
    showToast('Arquivo grande demais (máx. ~3 MB). Tente um link.');
    e.target.value = '';
    return;
  }
  const dataUrl = await fileToDataURL(f);
  mediaDraft = { kind: 'file', type: guessType(f.name, f.type), value: dataUrl, name: f.name };
  renderPreview();
});

el('fSoundFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 2 * 1024 * 1024) {
    showToast('Áudio grande demais (máx. ~2 MB). Tente um link.');
    e.target.value = '';
    return;
  }
  const dataUrl = await fileToDataURL(f);
  soundDraft = { kind: 'file', value: dataUrl, name: f.name };
  el('soundName').textContent = f.name;
});

el('btnTestSound').addEventListener('click', () => {
  const s = currentSoundDraft();
  if (!s || !s.value) { showToast('Nenhum som escolhido ainda'); return; }
  const a = el('testAudio');
  a.src = s.value;
  a.currentTime = 0;
  a.play().catch(() => showToast('Não consegui tocar esse som'));
});

/* ---------- Salvar ---------- */
el('btnSave').addEventListener('click', () => {
  const name = el('fName').value.trim();
  if (!name) { showToast('Dá um nome pro humor ♡'); el('fName').focus(); return; }

  const payload = {
    name,
    emoji: el('fEmoji').value.trim() || '💗',
    tint: selectedTint(),
    media: currentMediaDraft(),
    sound: currentSoundDraft(),
  };

  if (editingId) {
    Store.updateMood(editingId, payload);
    showToast('Humor atualizado ✨');
  } else {
    Store.addMood(payload);
    showToast('Humor criado 💗');
  }
  resetForm();
  renderList();
});

/* ---------- Formulário: reset e edição ---------- */
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
  setTint(Store.TINTS[0]);
  el('formTitle').textContent = 'Novo humor';
  el('formSub').textContent = 'Preencha os campos e salve. Depois é só editar quando quiser.';
  el('btnReset').hidden = true;
  renderPreview();
}

el('btnReset').addEventListener('click', resetForm);

function startEdit(id) {
  const m = Store.getMood(id);
  if (!m) return;
  editingId = id;
  el('fName').value = m.name;
  el('fEmoji').value = m.emoji || '';
  setTint(m.tint);

  // mídia
  if (m.media && m.media.kind === 'url') {
    mediaKind = 'url'; setSegActive('segMedia', 'url');
    el('mediaUrlWrap').hidden = false; el('mediaFileWrap').hidden = true;
    el('fMediaUrl').value = m.media.value;
    mediaDraft = null;
  } else if (m.media) {
    mediaKind = 'file'; setSegActive('segMedia', 'file');
    el('mediaUrlWrap').hidden = true; el('mediaFileWrap').hidden = false;
    el('fMediaUrl').value = '';
    mediaDraft = m.media;
  } else {
    mediaKind = 'url'; setSegActive('segMedia', 'url');
    el('fMediaUrl').value = ''; mediaDraft = null;
  }

  // som
  if (m.sound && m.sound.kind === 'url') {
    soundKind = 'url'; setSegActive('segSound', 'url');
    el('soundUrlWrap').hidden = false; el('soundFileWrap').hidden = true;
    el('fSoundUrl').value = m.sound.value;
    soundDraft = null;
    el('soundName').textContent = '';
  } else if (m.sound) {
    soundKind = 'file'; setSegActive('segSound', 'file');
    el('soundUrlWrap').hidden = true; el('soundFileWrap').hidden = false;
    soundDraft = m.sound;
    el('soundName').textContent = m.sound.name || 'arquivo salvo';
  } else {
    soundKind = 'url'; setSegActive('segSound', 'url');
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
  const moods = Store.getMoods();
  const list = el('moodList');
  list.innerHTML = '';
  el('countSub').textContent = moods.length
    ? `${moods.length} humor${moods.length > 1 ? 'es' : ''} disponíve${moods.length > 1 ? 'is' : 'l'} na página inicial.`
    : 'Nenhum humor ainda — crie o primeiro acima.';

  if (!moods.length) {
    list.innerHTML = '<div class="empty-state"><span class="big">🌸</span>Sua lista está vaziazinha.</div>';
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

/* ---------- Confirmação de exclusão ---------- */
function askDelete(mood) {
  pendingDelete = mood.id;
  el('confirmTitle').textContent = `Apagar “${mood.name}”?`;
  el('confirmText').textContent = 'O humor sai da página inicial. Os registros antigos no histórico continuam salvos.';
  el('confirmOverlay').hidden = false;
}

el('confirmNo').addEventListener('click', () => { pendingDelete = null; el('confirmOverlay').hidden = true; });
el('confirmYes').addEventListener('click', () => {
  if (pendingDelete) {
    Store.removeMood(pendingDelete);
    if (editingId === pendingDelete) resetForm();
    showToast('Humor apagado');
  }
  pendingDelete = null;
  el('confirmOverlay').hidden = true;
  renderList();
});

/* ---------- Backup ---------- */
el('btnExport').addEventListener('click', () => {
  const blob = new Blob([Store.exportAll()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'humorometro-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Backup baixado 💾');
});

el('btnImport').addEventListener('click', () => el('importFile').click());
el('importFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    Store.importAll(await f.text());
    showToast('Backup restaurado ✨');
    resetForm();
    renderList();
  } catch (err) {
    showToast('Arquivo inválido 😢');
  }
  e.target.value = '';
});

/* ---------- Utilitário ---------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ---------- Início ---------- */
markActiveNav();
buildPickers();
resetForm();
renderList();
