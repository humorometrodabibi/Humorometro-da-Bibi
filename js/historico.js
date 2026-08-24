/* ============================================================
   historico.js — acompanhamento dos humores registrados
   ============================================================ */

const elx = id => document.getElementById(id);
let filter = 'all';
let deleteTarget = null;   // id do registro, ou 'all'

/* ---------- Estatísticas ---------- */
function renderStats() {
  const recs = Store.getRecords();
  const box = elx('stats');

  if (!recs.length) { box.innerHTML = ''; return; }

  // humor mais frequente
  const counts = {};
  recs.forEach(r => { counts[r.moodName] = (counts[r.moodName] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  // registros nos últimos 7 dias
  const weekAgo = Date.now() - 7 * 86400000;
  const week = recs.filter(r => new Date(r.at).getTime() >= weekAgo).length;

  const withMsg = recs.filter(r => r.message && r.message.trim()).length;

  box.innerHTML = `
    <div class="stat"><div class="k">Registros</div><div class="v">${recs.length}</div></div>
    <div class="stat"><div class="k">Últimos 7 dias</div><div class="v">${week}</div></div>
    <div class="stat"><div class="k">Humor mais frequente</div><div class="v">${escapeHtml(top[0])}</div></div>
    <div class="stat"><div class="k">Pedidinhos</div><div class="v">${withMsg}</div></div>
  `;
}

/* ---------- Filtro por humor ---------- */
function renderFilter() {
  const sel = elx('filterMood');
  const names = [...new Set(Store.getRecords().map(r => r.moodName))];
  sel.innerHTML = '<option value="all">Todos os humores</option>' +
    names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.value = filter;
}

/* ---------- Linha do tempo ---------- */
function renderTimeline() {
  const all = Store.getRecords();
  const recs = filter === 'all' ? all : all.filter(r => r.moodName === filter);
  const tl = elx('timeline');
  tl.innerHTML = '';

  if (!recs.length) {
    tl.innerHTML = `
      <div class="empty-state">
        <span class="big">🕰️</span>
        Nenhum registro ${filter === 'all' ? 'ainda' : 'com esse humor'}.<br>
        <a class="btn btn-sm" style="margin-top:14px" href="index.html">Registrar um humor</a>
      </div>`;
    return;
  }

  let lastDay = null;
  recs.forEach(r => {
    const key = dayKey(r.at);
    if (key !== lastDay) {
      lastDay = key;
      const h = document.createElement('div');
      h.className = 'day-label';
      h.textContent = fmtDayLabel(r.at);
      tl.appendChild(h);
    }

    const card = document.createElement('div');
    card.className = 'entry';
    card.style.setProperty('--tint', r.moodTint || '#FFDDE7');

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const node = buildMediaEl(r.media, { cover: true });
    if (node) { if (node.tagName === 'VIDEO') node.muted = true; thumb.appendChild(node); }
    else thumb.textContent = r.moodEmoji || '💗';

    const body = document.createElement('div');
    body.className = 'body';
    const msg = (r.message || '').trim();
    body.innerHTML = `
      <div class="when">${fmtDate(r.at)} · ${fmtTime(r.at)}</div>
      <div class="mood">${r.moodEmoji || ''} ${escapeHtml(r.moodName)}</div>
      <div class="msg ${msg ? '' : 'empty'}">${msg ? escapeHtml(msg) : 'sem pedidinho neste registro'}</div>`;

    const side = document.createElement('div');
    const del = document.createElement('button');
    del.className = 'btn btn-sm btn-ghost';
    del.textContent = '✕';
    del.title = 'Apagar registro';
    del.addEventListener('click', () => {
      deleteTarget = r.id;
      elx('confirmTitle').textContent = 'Apagar este registro?';
      elx('confirmText').textContent = `${r.moodName} · ${fmtDate(r.at)} às ${fmtTime(r.at)}`;
      elx('confirmOverlay').hidden = false;
    });
    side.appendChild(del);

    card.append(thumb, body, side);
    tl.appendChild(card);
  });
}

/* ---------- Eventos ---------- */
elx('filterMood').addEventListener('change', e => { filter = e.target.value; renderTimeline(); });

elx('btnClear').addEventListener('click', () => {
  if (!Store.getRecords().length) { showToast('Não há registros para apagar'); return; }
  deleteTarget = 'all';
  elx('confirmTitle').textContent = 'Apagar todos os registros?';
  elx('confirmText').textContent = 'Os humores cadastrados continuam; só o histórico é apagado.';
  elx('confirmOverlay').hidden = false;
});

elx('confirmNo').addEventListener('click', () => { deleteTarget = null; elx('confirmOverlay').hidden = true; });

elx('confirmYes').addEventListener('click', () => {
  if (deleteTarget === 'all') { Store.clearRecords(); showToast('Histórico limpo'); }
  else if (deleteTarget) { Store.removeRecord(deleteTarget); showToast('Registro apagado'); }
  deleteTarget = null;
  elx('confirmOverlay').hidden = true;
  filter = 'all';
  refresh();
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function refresh() { renderStats(); renderFilter(); renderTimeline(); }

/* ---------- Início ---------- */
markActiveNav();
refresh();
