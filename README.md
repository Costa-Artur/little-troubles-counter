# Little Troubles — contador de mesa

**Abrir o app:** https://nickowolf.github.io/little-troubles-counter/

O site publica o app em React Native da pasta [`mobile/`](mobile/README.md) (versão web do Expo), em inglês, com 2 a 6 jogadores e disposições de mesa no estilo do Lotus. Ele é atualizado sozinho a cada push na `main` (GitHub Actions) e pode ser instalado na tela inicial. A mesma pasta gera o app Android para a Play Store.

## Versão antiga (PWA em português)

Os arquivos na raiz (`index.html`, `style.css`, `app.js`, `sw.js`) são a primeira versão do contador, em HTML/JS puro. Ela não é mais publicada no site, mas continua aqui e pode ser aberta localmente.

### Como usar (versão antiga)

- Cada jogador tem um painel virado para o seu lado da mesa (2, 3 ou 4 jogadores).
- **Cookies** (número grande, começa em 30): toque na metade direita para **+1** e na esquerda para **−1**. Segure para **±10**. Um indicador mostra a variação recente (ex.: `−7`).
- **Lutas vencidas**: botões − e + logo abaixo, com barra de 10 segmentos.
- **Vitória**: ao chegar a **100 cookies** ou **10 lutas vencidas**, o painel do jogador mostra a vitória.
- **Objetivo** (ícone de mapa, canto do painel): ao jogar uma carta de Objetivo (quest), escolha quantas tarefas (pegadas) ela tem. O painel vira uma "carta" com as tarefas para marcar e, se quiser, o nome da carta. Quando todas estiverem feitas, o app avisa para pegar a recompensa e enviar a carta ao Timeout. Jogar outro Objetivo manda o atual pro Timeout.
- **Ajustes do jogador** (ícone de controles, canto do painel): nome, cor e ajustes rápidos de cookies e lutas.
- **Botão central**: sortear quem começa, dados D4 a D100, moeda, número de jogadores, cookies iniciais, nova partida e lembretes das regras.
- A tela fica ligada enquanto o app está aberto (quando o navegador permite).

### Rodar no computador (versão antiga)

```powershell
python -m http.server 5173
```

Depois abra http://localhost:5173.

### Usar no celular (versão antiga)

O app é só um conjunto de arquivos estáticos (`index.html`, `style.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`). Publique a pasta em um host HTTPS gratuito, por exemplo:

- **GitHub Pages**: suba a pasta para um repositório e ative o Pages.
- **Netlify Drop** (app.netlify.com/drop): arraste a pasta para a página.

No celular, abra o link e use **"Adicionar à tela inicial"**. Depois disso o app também funciona sem internet.

> Para um teste rápido na mesma rede Wi-Fi, rode o servidor acima e abra `http://IP-DO-PC:5173` no celular. Nesse modo o app funciona, mas a instalação e o uso offline exigem HTTPS.

Os dados ficam salvos só no próprio aparelho.
