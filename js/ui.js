/* ============================================================
   ui.js — pedacinhos de interface usados nas três páginas
   ============================================================ */

/* ---------- Menu ---------- */
export function markActiveNav() {
  const file = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === file || (file === '' && href === 'index.html')) a.classList.add('is-active');
  });
}

/* ---------- Avisinho flutuante ---------- */
export function showToast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('is-on'), 2800);
}

/* ---------- Texto seguro ---------- */
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ---------- Mídia ---------- */
export function buildMediaEl(media, { cover = false } = {}) {
  if (!media || !media.value) return null;
  if (media.type === 'video') {
    const v = document.createElement('video');
    v.src = media.value;
    v.autoplay = true; v.loop = true; v.muted = true;
    v.playsInline = true; v.setAttribute('playsinline', '');
    if (cover) v.style.objectFit = 'cover';
    return v;
  }
  const img = document.createElement('img');
  img.src = media.value;
  img.alt = '';
  if (cover) img.style.objectFit = 'cover';
  return img;
}

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/* ---------- Datas em português ---------- */
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function fmtDayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'hoje';
  if (same(d, yesterday)) return 'ontem';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function dayKey(iso) { return new Date(iso).toDateString(); }

/* ---------- Tela de login ---------- */
/* Criada por JavaScript para não precisar repetir o mesmo HTML
   nas três páginas. */
export function buildAuthGate({ onSignIn, onSignOut }) {
  const gate = document.createElement('div');
  gate.className = 'gate';
  gate.hidden = true;
  gate.innerHTML = `
    <div class="gate-card">
      <div class="gate-heart">💗</div>
      <h2 class="gate-title">Humorômetro da Bibi</h2>
      <p class="gate-text" data-role="text">Um cantinho só de vocês dois.</p>
      <button class="btn btn-primary gate-btn" data-role="signin">Entrar com Google</button>
      <button class="btn btn-sm btn-ghost gate-btn" data-role="signout" hidden>Sair desta conta</button>
      <p class="gate-hint" data-role="hint"></p>
    </div>`;
  document.body.appendChild(gate);

  const $ = role => gate.querySelector(`[data-role="${role}"]`);
  $('signin').addEventListener('click', onSignIn);
  $('signout').addEventListener('click', onSignOut);

  return {
    show(state, detail = '') {
      gate.hidden = false;
      document.querySelector('.shell')?.setAttribute('aria-hidden', 'true');

      if (state === 'loading') {
        $('text').textContent = 'Abrindo o seu cantinho...';
        $('signin').hidden = true;
        $('signout').hidden = true;
        $('hint').textContent = '';
      }
      if (state === 'signedOut') {
        $('text').textContent = 'Um cantinho só de vocês dois.';
        $('signin').hidden = false;
        $('signout').hidden = true;
        $('hint').textContent = 'Entre com a conta Google que combinaram.';
      }
      if (state === 'denied') {
        $('text').textContent = 'Esta conta não tem acesso.';
        $('signin').hidden = true;
        $('signout').hidden = false;
        $('hint').textContent = detail || 'Saia e entre com a conta autorizada.';
      }
      if (state === 'error') {
        $('text').textContent = 'Algo deu errado ao entrar.';
        $('signin').hidden = false;
        $('signout').hidden = false;
        $('hint').textContent = detail;
      }
      if (state === 'blocked') {
        // falta configuração ou o Firebase não carregou:
        // não adianta oferecer botão de login
        $('text').textContent = 'Falta um passo na configuração.';
        $('signin').hidden = true;
        $('signout').hidden = true;
        $('hint').textContent = detail;
      }
    },
    hide() {
      gate.hidden = true;
      document.querySelector('.shell')?.removeAttribute('aria-hidden');
    },
  };
}

/* ---------- Rodapé com quem está conectado ---------- */
export function renderAccountBadge(user, onSignOut) {
  let box = document.querySelector('.account');
  if (!box) {
    box = document.createElement('div');
    box.className = 'account';
    document.querySelector('.sidebar')?.appendChild(box);
  }
  box.innerHTML = `
    <span class="account-mail">${escapeHtml(user.email)}</span>
    <button class="account-out" type="button">sair</button>`;
  box.querySelector('.account-out').addEventListener('click', onSignOut);
}
