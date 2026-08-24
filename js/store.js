/* ============================================================
   store.js — camada de dados do Humorômetro
   Tudo (humores, mídias, sons e registros) fica salvo no
   localStorage do navegador. Nada é fixo no código: a página
   Inputs cria, edita e apaga os humores.
   ============================================================ */

const Store = (() => {
  const KEY_MOODS   = 'humorometro.moods.v1';
  const KEY_RECORDS = 'humorometro.records.v1';
  const KEY_META    = 'humorometro.meta.v1';

  // Paleta usada nos cartões de humor
  const TINTS = ['#FFDDE7', '#C6E3EE', '#CFE8BB', '#FBE7A8', '#E0D6F5', '#FFE0CE'];

  // Humores iniciais apenas como ponto de partida — podem ser
  // editados ou apagados livremente na página Inputs.
  const SEED = [
    { name: 'Feliz',      emoji: '😊', tint: TINTS[0] },
    { name: 'Triste',     emoji: '🥺', tint: TINTS[1] },
    { name: 'Cansada',    emoji: '😴', tint: TINTS[2] },
    { name: 'Brava',      emoji: '😤', tint: TINTS[3] },
    { name: 'Ansiosa',    emoji: '😰', tint: TINTS[4] },
    { name: 'Apaixonada', emoji: '🥰', tint: TINTS[5] },
  ];

  function uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Não consegui ler', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Não consegui salvar', key, e);
      alertQuota();
      return false;
    }
  }

  function alertQuota() {
    // Mensagem amigável quando o espaço do navegador acaba
    if (typeof window.showToast === 'function') {
      window.showToast('Espaço do navegador cheio 😢 use links (URL) em vez de arquivos grandes');
    }
  }

  // Semeia os humores iniciais só na primeira visita
  function ensureSeed() {
    const meta = read(KEY_META, {});
    if (meta.seeded) return;
    const moods = SEED.map(m => ({
      id: uid('m_'),
      name: m.name,
      emoji: m.emoji,
      tint: m.tint,
      media: null,   // { kind:'url'|'file', type:'image'|'video', value:'...' }
      sound: null,   // { kind:'url'|'file', value:'...', name:'' }
      createdAt: new Date().toISOString(),
    }));
    write(KEY_MOODS, moods);
    write(KEY_META, { ...meta, seeded: true });
  }

  /* ---------- Humores ---------- */
  function getMoods() {
    ensureSeed();
    return read(KEY_MOODS, []);
  }

  function saveMoods(list) { return write(KEY_MOODS, list); }

  function getMood(id) { return getMoods().find(m => m.id === id) || null; }

  function addMood(data) {
    const moods = getMoods();
    const mood = {
      id: uid('m_'),
      name: (data.name || 'Sem nome').trim(),
      emoji: data.emoji || '💗',
      tint: data.tint || TINTS[moods.length % TINTS.length],
      media: data.media || null,
      sound: data.sound || null,
      createdAt: new Date().toISOString(),
    };
    moods.push(mood);
    return saveMoods(moods) ? mood : null;
  }

  function updateMood(id, patch) {
    const moods = getMoods();
    const i = moods.findIndex(m => m.id === id);
    if (i < 0) return null;
    moods[i] = { ...moods[i], ...patch, id };
    return saveMoods(moods) ? moods[i] : null;
  }

  function removeMood(id) {
    const moods = getMoods().filter(m => m.id !== id);
    return saveMoods(moods);
  }

  /* ---------- Registros de humor ---------- */
  function getRecords() {
    return read(KEY_RECORDS, []).sort((a, b) => b.at.localeCompare(a.at));
  }

  function addRecord(mood) {
    const records = read(KEY_RECORDS, []);
    const rec = {
      id: uid('r_'),
      at: new Date().toISOString(),
      moodId: mood.id,
      moodName: mood.name,
      moodEmoji: mood.emoji,
      moodTint: mood.tint,
      // guardamos uma cópia da mídia para o histórico continuar
      // fazendo sentido mesmo se o humor for editado depois
      media: mood.media || null,
      message: '',
    };
    records.push(rec);
    write(KEY_RECORDS, records);
    return rec;
  }

  function setRecordMessage(id, message) {
    const records = read(KEY_RECORDS, []);
    const i = records.findIndex(r => r.id === id);
    if (i < 0) return false;
    records[i].message = message;
    return write(KEY_RECORDS, records);
  }

  function removeRecord(id) {
    return write(KEY_RECORDS, read(KEY_RECORDS, []).filter(r => r.id !== id));
  }

  function clearRecords() { return write(KEY_RECORDS, []); }

  /* ---------- Backup ---------- */
  function exportAll() {
    return JSON.stringify({
      app: 'humorometro-da-bibi',
      version: 1,
      exportedAt: new Date().toISOString(),
      moods: getMoods(),
      records: getRecords(),
    }, null, 2);
  }

  function importAll(json) {
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.moods)) throw new Error('Arquivo de backup inválido');
    write(KEY_MOODS, data.moods);
    write(KEY_RECORDS, Array.isArray(data.records) ? data.records : []);
    write(KEY_META, { seeded: true });
    return true;
  }

  return {
    TINTS, uid,
    getMoods, getMood, saveMoods, addMood, updateMood, removeMood,
    getRecords, addRecord, setRecordMessage, removeRecord, clearRecords,
    exportAll, importAll,
  };
})();

/* ============================================================
   Utilitários compartilhados entre as páginas
   ============================================================ */

// Marca o item ativo do menu lateral
function markActiveNav() {
  const file = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === file || (file === '' && href === 'index.html')) a.classList.add('is-active');
  });
}

// Avisinho flutuante
function showToast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('is-on'), 2600);
}
window.showToast = showToast;

// Cria o elemento de mídia (imagem ou vídeo) a partir do objeto salvo
function buildMediaEl(media, { cover = false } = {}) {
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

// Lê um arquivo escolhido pelo usuário e devolve base64 (data URL)
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Datas em português
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function fmtDayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'hoje';
  if (same(d, yesterday)) return 'ontem';
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}

function dayKey(iso) { return new Date(iso).toDateString(); }
