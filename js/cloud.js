/* ============================================================
   cloud.js — conversa com o Firebase
   Autenticação com Google + banco de dados em tempo real.
   Nenhuma outra página fala com o Firebase diretamente:
   todas passam por aqui.

   O código do Firebase é carregado sob demanda (import dinâmico)
   para que, se a internet falhar ou as chaves estiverem faltando,
   o site consiga mostrar um aviso em vez de uma tela branca.
   ============================================================ */

import { firebaseConfig, emailsPermitidos } from './config.js';
import { buildAuthGate, renderAccountBadge, showToast } from './ui.js';

const SDK = 'https://www.gstatic.com/firebasejs/12.18.0';

/* ---------- Cores sugeridas para os cartões ---------- */
export const TINTS = ['#FFDDE7', '#C6E3EE', '#CFE8BB', '#FBE7A8', '#E0D6F5', '#FFE0CE'];

/* ---------- Humores sugeridos (só quando o banco está vazio) ---------- */
export const SUGESTOES = [
  { name: 'Feliz',      emoji: '😊' },
  { name: 'Apaixonada', emoji: '🥰' },
  { name: 'Cansada',    emoji: '😴' },
  { name: 'Triste',     emoji: '🥺' },
  { name: 'Ansiosa',    emoji: '😰' },
  { name: 'Brava',      emoji: '😤' },
];

/* ---------- Estado interno ---------- */
let fb = null;           // funções do SDK, preenchidas no start()
let auth = null, db = null;
let currentUser = null;

function configPreenchida() {
  return firebaseConfig.apiKey && !String(firebaseConfig.apiKey).includes('COLE_AQUI');
}

function exigeConexao() {
  if (!db) throw new Error('Ainda não conectado ao Firebase');
}

/* ============================================================
   start() — chame no começo de cada página.
   Só executa o seu código depois que a pessoa entrou e foi
   reconhecida como autorizada.
   ============================================================ */
export async function start(onReady) {
  const gate = buildAuthGate({
    onSignIn: () => entrar(gate),
    onSignOut: () => sair(),
  });

  if (!configPreenchida()) {
    gate.show('blocked', 'O arquivo js/config.js ainda está com "COLE_AQUI". Preencha com as chaves do seu projeto no Firebase.');
    return;
  }

  gate.show('loading');

  /* 1. Carrega o SDK do Firebase */
  try {
    const [appMod, authMod, dbMod] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-database.js`),
    ]);
    fb = { ...appMod, ...authMod, ...dbMod };
  } catch (e) {
    console.error(e);
    gate.show('blocked', 'Não consegui carregar o Firebase. Verifique sua conexão com a internet e recarregue a página.');
    return;
  }

  /* 2. Conecta ao seu projeto */
  try {
    const app = fb.initializeApp(firebaseConfig);
    auth = fb.getAuth(app);
    db = fb.getDatabase(app);
  } catch (e) {
    console.error(e);
    gate.show('blocked', 'As chaves em js/config.js parecem inválidas: ' + e.message);
    return;
  }

  // mantém a pessoa logada mesmo depois de fechar o navegador
  fb.setPersistence(auth, fb.browserLocalPersistence).catch(() => {});

  /* 3. Observa quem está logado */
  fb.onAuthStateChanged(auth, user => {
    if (!user) {
      currentUser = null;
      gate.show('signedOut');
      return;
    }

    const email = (user.email || '').toLowerCase();
    const liberados = emailsPermitidos.map(e => String(e).toLowerCase().trim());

    if (!liberados.includes(email)) {
      currentUser = null;
      gate.show('denied', `${user.email} não está na lista de e-mails autorizados.`);
      return;
    }

    currentUser = user;
    gate.hide();
    renderAccountBadge(user, sair);
    onReady(user);
  });
}

async function entrar(gate) {
  const provider = new fb.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await fb.signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    if (e.code === 'auth/unauthorized-domain') {
      gate.show('error', 'Este endereço não está autorizado no Firebase. Adicione-o em Authentication → Settings → Authorized domains.');
      return;
    }
    if (e.code === 'auth/operation-not-allowed') {
      gate.show('error', 'O login com Google ainda não foi ativado no Firebase. Ative em Authentication → Sign-in method.');
      return;
    }
    console.error(e);
    gate.show('error', e.message);
  }
}

function sair() {
  if (auth) fb.signOut(auth).catch(() => {});
}

export function usuarioAtual() { return currentUser; }

/* ============================================================
   HUMORES
   ============================================================ */

/* Escuta a lista de humores. Toda mudança feita por qualquer
   aparelho chama a função de volta na hora. */
export function ouvirHumores(callback) {
  exigeConexao();
  return fb.onValue(fb.ref(db, 'moods'), snap => {
    const obj = snap.val() || {};
    const lista = Object.entries(obj)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) ||
                      String(a.createdAt).localeCompare(String(b.createdAt)));
    callback(lista);
  }, err => {
    console.error(err);
    showToast('Sem permissão para ler os humores. Confira as regras do banco.');
  });
}

export async function criarHumor(dados) {
  exigeConexao();
  const r = fb.push(fb.ref(db, 'moods'));
  await fb.set(r, {
    name: (dados.name || 'Sem nome').trim(),
    emoji: dados.emoji || '💗',
    tint: dados.tint || TINTS[0],
    media: dados.media || null,
    sound: dados.sound || null,
    order: dados.order ?? Date.now(),
    createdAt: new Date().toISOString(),
  });
  return r.key;
}

export function atualizarHumor(id, patch) {
  exigeConexao();
  return fb.update(fb.ref(db, 'moods/' + id), patch);
}

export function apagarHumor(id) {
  exigeConexao();
  return fb.remove(fb.ref(db, 'moods/' + id));
}

/* ============================================================
   REGISTROS
   ============================================================ */

export function ouvirRegistros(callback) {
  exigeConexao();
  return fb.onValue(fb.ref(db, 'records'), snap => {
    const obj = snap.val() || {};
    const lista = Object.entries(obj)
      .map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    callback(lista);
  }, err => {
    console.error(err);
    showToast('Sem permissão para ler o histórico. Confira as regras do banco.');
  });
}

export async function registrarHumor(mood) {
  exigeConexao();
  const r = fb.push(fb.ref(db, 'records'));
  await fb.set(r, {
    at: new Date().toISOString(),
    moodId: mood.id,
    moodName: mood.name,
    moodEmoji: mood.emoji || '',
    moodTint: mood.tint || TINTS[0],
    media: mood.media || null,
    message: '',
    byEmail: currentUser ? currentUser.email : '',
  });
  return r.key;
}

export function salvarRecado(id, message) {
  exigeConexao();
  return fb.update(fb.ref(db, 'records/' + id), { message });
}

export function apagarRegistro(id) {
  exigeConexao();
  return fb.remove(fb.ref(db, 'records/' + id));
}

export function apagarTodosRegistros() {
  exigeConexao();
  return fb.remove(fb.ref(db, 'records'));
}

/* ============================================================
   Ajudantes
   ============================================================ */

export async function criarHumoresSugeridos() {
  for (let i = 0; i < SUGESTOES.length; i++) {
    await criarHumor({ ...SUGESTOES[i], tint: TINTS[i % TINTS.length], order: i });
  }
}

/* Traz para a nuvem o que estava salvo só neste navegador
   (dados da versão anterior do site). */
export async function importarDoNavegador() {
  exigeConexao();
  const moodsAntigos = JSON.parse(localStorage.getItem('humorometro.moods.v1') || '[]');
  const recsAntigos  = JSON.parse(localStorage.getItem('humorometro.records.v1') || '[]');

  let n = 0;
  for (let i = 0; i < moodsAntigos.length; i++) {
    await criarHumor({ ...moodsAntigos[i], order: i });
    n++;
  }
  for (const r of recsAntigos) {
    const novo = fb.push(fb.ref(db, 'records'));
    await fb.set(novo, {
      at: r.at,
      moodId: r.moodId || '',
      moodName: r.moodName || '',
      moodEmoji: r.moodEmoji || '',
      moodTint: r.moodTint || TINTS[0],
      media: r.media || null,
      message: r.message || '',
      byEmail: currentUser ? currentUser.email : '',
    });
    n++;
  }
  return n;
}
