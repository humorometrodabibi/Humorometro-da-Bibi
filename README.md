# Humorômetro da Bibi 💗

Site pessoal onde a Bibi registra como está se sentindo, e eu acompanho.

## Como funciona

- **index.html** — página inicial: escolher o humor, enviar, ver o gif/vídeo e ouvir o som.
- **inputs.html** — cadastro dos humores: nome, emoji, cor, mídia e som de cada um.
- **historico.html** — histórico dos registros com data, hora, humor e o recadinho.

## Estrutura dos arquivos

```
index.html          página inicial
inputs.html         cadastro dos humores
historico.html      histórico dos registros
css/style.css       todo o visual do site
js/store.js         camada de dados (localStorage) + utilitários
js/app.js           lógica da página inicial
js/inputs.js        lógica do cadastro
js/historico.js     lógica do histórico
fonts/              fontes do site (Baloo 2, Quicksand, Fraunces)
```

## Onde os dados ficam salvos

Tudo é guardado no `localStorage` do navegador — ou seja, **dentro do aparelho de quem
está usando**. Nada vai para um servidor.

Consequência: humores cadastrados no computador não aparecem no celular, e vice-versa.
A página Inputs tem um botão de **Backup** (baixa um `.json`) e **Restaurar** (carrega
esse `.json` em outro aparelho) para contornar isso manualmente.

## Rodando localmente

Não precisa de servidor nem instalação: é só abrir o `index.html` no navegador.

## Hospedagem

Publicado com GitHub Pages a partir da branch `main`.
