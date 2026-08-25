/* ============================================================
   config.js — O ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR

   1) Cole abaixo as chaves do seu projeto no Firebase.
      (Console do Firebase → engrenagem → Configurações do projeto
       → seus apps → Configuração do SDK → "Config")

   2) Coloque os e-mails do Google que podem entrar no site.

   Essas chaves não são segredo: elas ficam visíveis no navegador
   de qualquer visitante, e é assim mesmo que o Firebase funciona.
   Quem protege os dados são as REGRAS do banco, que você vai
   configurar seguindo o guia.
   ============================================================ */

export const firebaseConfig = {
  apiKey:            "AIzaSyAau6Zygu8N47Qje8W2sWu_GjbP84tMml4",
  authDomain:        "umorometro-da-bibi.firebaseapp.com",
  databaseURL:       "https://umorometro-da-bibi-default-rtdb.firebaseio.com",
  projectId:         "umorometro-da-bibi",
  storageBucket:     "umorometro-da-bibi.firebasestorage.app",
  messagingSenderId: "25825254910",
  appId:             "1:25825254910:web:4999ead70905d38cb934af",
};

/* E-mails do Google autorizados a usar o site.
   Escreva em letras minúsculas, entre aspas, separados por vírgula. */
export const emailsPermitidos = [
  "mauriciocasaless@gmail.com",
  "seixas.beatriz00@gmail.com",
];
