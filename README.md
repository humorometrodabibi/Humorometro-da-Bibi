# Humorômetro da Bibi 💗

Site pessoal onde a Bibi registra como está se sentindo, e eu acompanho —
de qualquer aparelho, em tempo real.

## Páginas

- **index.html** — escolher o humor, enviar, ver o gif/vídeo e ouvir o som.
- **inputs.html** — cadastro dos humores: nome, emoji, cor, mídia e som.
- **historico.html** — histórico dos registros com data, hora, humor e o recadinho.

## Estrutura dos arquivos

```
index.html          página inicial
inputs.html         cadastro dos humores
historico.html      histórico dos registros
css/style.css       todo o visual do site
js/config.js        >>> ÚNICO ARQUIVO A EDITAR: chaves do Firebase e e-mails
js/cloud.js         login e banco de dados (Firebase)
js/ui.js            pedaços de interface compartilhados
js/app.js           lógica da página inicial
js/inputs.js        lógica do cadastro
js/historico.js     lógica do histórico
fonts/              fontes do site (Baloo 2, Quicksand, Fraunces)
```

## Como os dados funcionam

Humores e registros ficam no **Firebase Realtime Database**. Qualquer alteração
aparece na hora nos dois aparelhos, sem recarregar a página.

O acesso é protegido por **login com Google**: só os e-mails listados em
`js/config.js` entram, e as regras do banco repetem essa mesma lista do lado do
servidor — é isso que impede outra pessoa de ler o histórico.

### Configuração

1. Crie um projeto no [Firebase](https://console.firebase.google.com).
2. Ative **Authentication → Sign-in method → Google**.
3. Crie um **Realtime Database**.
4. Cole as chaves e os e-mails autorizados em `js/config.js`.
5. Nas regras do banco, autorize apenas esses e-mails:

```json
{
  "rules": {
    ".read":  "auth != null && (auth.token.email === 'EMAIL_1' || auth.token.email === 'EMAIL_2')",
    ".write": "auth != null && (auth.token.email === 'EMAIL_1' || auth.token.email === 'EMAIL_2')"
  }
}
```

6. Em **Authentication → Settings → Authorized domains**, adicione o endereço do site.

As chaves de `config.js` não são secretas — elas ficam visíveis no navegador de
qualquer visitante, e o Firebase foi feito assim. Quem protege os dados são as
regras acima.

## Sobre mídias e sons

Prefira cadastrar gifs e sons por **link (URL)**. Arquivos enviados do computador
são convertidos em texto e ocupam muito espaço no banco — o site limita o tamanho
por esse motivo.

## Rodando

Por usar módulos JavaScript e login do Google, o site precisa ser aberto por um
endereço `http://` ou `https://` — abrir o arquivo direto do disco não funciona.
Use a URL publicada no GitHub Pages.

## Hospedagem

GitHub Pages, a partir da branch `main`.
