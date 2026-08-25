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
  apiKey:            "COLE_AQUI",
  authDomain:        "COLE_AQUI",
  databaseURL:       "COLE_AQUI",
  projectId:         "COLE_AQUI",
  storageBucket:     "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId:             "COLE_AQUI",
};

/* E-mails do Google autorizados a usar o site.
   Escreva em letras minúsculas, entre aspas, separados por vírgula. */
export const emailsPermitidos = [
  "seu-email@gmail.com",
  "email-da-bibi@gmail.com",
];
