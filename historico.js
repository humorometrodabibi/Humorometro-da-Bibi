/* ============================================================
   historico.js — acompanhamento dos humores registrados
   ============================================================ */

import { start, ouvirRegistros, apagarRegistro, apagarTodosRegistros } from './cloud.js';
import {
  markActiveNav, showToast, escapeHtml, buildMediaEl,
  fmtDate, fmtTime, fmtDayLabel, dayKey,
} from './ui.js';

const el = id => document.getElementById(id);

let records = [];
let filter = 'all';
let deleteTarget = null;

markActiveNav();

start(() => {
  ouvirRegistros(lista => { records = lista; refresh(); });
});

function refresh() { renderStats(); renderFilter(); renderTimeline(); }

/* ---------- Estatísticas ---------- */
function renderStats() {
  const box = el('stats');
  if (!records.length) { box.innerHTML = ''; return; }

  const counts = {};
  records.forEach(r => { counts[r.moodName] = (counts[r.moodName] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  const weekAgo = Date.now() - 7 * 86400000;
  const week = records.filter(r => new Date(r.at).getTime() >= weekAgo).length;
  const withMsg = records.filter(r => r.message && r.message.trim()).length;

  box.innerHTML = `
    <div class="stat"><div class="k">Registros</div><div class="v">${records.length}</div></div>
    <div class="stat"><div class="k">Últimos 7 dias</div><div class="v">${week}</div></div>
    <div class="stat"><div class="k">Humor mais frequente</div><div class="v">${escapeHtml(top[0])}</div></div>
    <div class="stat"><div class="k">Pedidinhos</div><div class="v">${withMsg}</div></div>`;
}

/* ---------- Filtro ---------- */
function renderFilter() {
  const sel = el('filterMood');
  const names = [...new Set(records.map(r => r.moodName))];
  sel.innerHTML = '<option value="all">Todos os humores</option>' +
    names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.value = names.includes(filter) ? filter : 'all';
  filter = sel.value;
}

/* ---------- Linha do tempo ---------- */
function renderTimeline() {
  const lista = filter === 'all' ? records : records.filter(r => r.moodName === filter);
  const tl = el('timeline');
  tl.innerHTML = '';

  if (!lista.length) {
    tl.innerHTML = `
      <div class="empty-state">
        <span class="big">🕰️</span>
        Nenhum registro ${filter === 'all' ? 'ainda' : 'com esse humor'}.<br>
        <a class="btn btn-sm" style="margin-top:14px" href="index.html">Registrar um humor</a>
      </div>`;
    return;
  }

  let lastDay = null;
  lista.forEach(r => {
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
      el('confirmTitle').textContent = 'Apagar este registro?';
      el('confirmText').textContent = `${r.moodName} · ${fmtDate(r.at)} às ${fmtTime(r.at)}`;
      el('confirmOverlay').hidden = false;
    });
    side.appendChild(del);

    card.append(thumb, body, side);
    tl.appendChild(card);
  });
}

/* ---------- Eventos ---------- */
el('filterMood').addEventListener('change', e => { filter = e.target.value; renderTimeline(); });

el('btnClear').addEventListener('click', () => {
  if (!records.length) { showToast('Não há registros para apagar'); return; }
  deleteTarget = 'all';
  el('confirmTitle').textContent = 'Apagar todos os registros?';
  el('confirmText').textContent = 'Os humores cadastrados continuam; só o histórico é apagado — para vocês dois.';
  el('confirmOverlay').hidden = false;
});

el('confirmNo').addEventListener('click', () => { deleteTarget = null; el('confirmOverlay').hidden = true; });

el('confirmYes').addEventListener('click', async () => {
  try {
    if (deleteTarget === 'all') { await apagarTodosRegistros(); showToast('Histórico limpo'); }
    else if (deleteTarget) { await apagarRegistro(deleteTarget); showToast('Registro apagado'); }
  } catch (e) { showToast('Não consegui apagar'); console.error(e); }
  deleteTarget = null;
  el('confirmOverlay').hidden = true;
  filter = 'all';
});
