# LT Counter — app (React Native / Expo)

Versão em React Native do contador de mesa para **Little Troubles TCG**, pronta para Android (Play Store) e iOS. Feita com Expo SDK 58.

O app inteiro está em **inglês**, com os termos oficiais das regras: Cookies, Fights Won, Goal, Tasks, Reward, Timeout, Playground.

## O que tem

- **2 a 6 jogadores**, com várias **disposições de mesa** no estilo do Lotus (menu → "Table layout"). Cada painel fica virado para o lado do seu jogador.
- **Cookies**: toque na metade direita para +1 e na esquerda para −1; segure para ±10. Um segundo dedo (pinça/zoom) cancela o toque, então o contador nunca dispara sozinho.
- **Fights Won** (ícone de mamadeira) com barra de 10.
- **Vitória** com 100 Cookies ou 10 Fights Won, com chuva de cookies. Depois da vitória, ninguém soma mais até uma nova partida.
- **Goal** (ícone de mapa): escolha de 1 a 8 Tasks, marque as pegadas, dê nome à carta, "Send to Timeout" ao completar e "Clear Goal" (pede um segundo toque).
- **Menu do cookie**: quem começa, dados D4–D100, moeda, jogadores, disposição, Cookies iniciais, nova partida (com confirmação "Start a new game?") e lembretes das regras.
- Tela sempre ligada, vibração (no celular) e tudo salvo no aparelho.

## Rodar no celular durante o desenvolvimento

```powershell
cd mobile
npm install
npx expo start
```

Instale o app **Expo Go** no celular e leia o QR code que aparece no terminal (celular e computador na mesma rede Wi-Fi).

Para testar no navegador: `npx expo start --web`.

## Site (GitHub Pages)

O mesmo app vira um site em https://nickowolf.github.io/little-troubles-counter/. A cada push na `main`, o GitHub Actions (`.github/workflows/pages.yml`) roda `npx expo export -p web` e publica a pasta `dist`. O caminho do site está em `app.json` (`experiments.baseUrl`), e os arquivos de instalação (manifest, ícones e o service worker para uso offline) ficam em `public/`.

Para testar o site localmente: `npx expo export -p web` e sirva a pasta `dist` dentro de uma pasta `little-troubles-counter`.

## Publicar na Play Store

O passo a passo completo está em **[PUBLISHING.md](PUBLISHING.md)**: conta Google Play, conta de serviço, assinatura no Expo, secret do GitHub, primeiro envio e releases automáticas.

- Projeto Expo: `@wcrdesign/lt-counter`; pacote Android: `pet.nick.ltcounter`.
- A CI em `.github/workflows/mobile.yml` verifica lint, TypeScript, dependências e bundle Android.
- Depois de ativada, cada alteração em `mobile/` na `main` gera AAB e envia para **teste interno**; tags `android-vX.Y.Z` enviam para **produção**.
- O modo manual `bootstrap` envia um rascunho inicial; `build-only` gera apenas o AAB.
- O EAS gerencia o `versionCode` remotamente. A versão visível continua em `app.json`.
- A automação depende de `EXPO_TOKEN` nos secrets do GitHub e de `PLAY_STORE_AUTOMATION_ENABLED=true` nas variáveis do repositório. As chaves Google e Android ficam no Expo.

## Estrutura

- `App.tsx`: estado da partida, salvamento, sorteio de quem começa, mesa e botão central.
- `src/Panel.tsx`: painel de cada jogador (toque/segurar, lutas, vitória).
- `src/Drawers.tsx`: ajustes do jogador e carta de Objetivo.
- `src/Menu.tsx`: menu, dados, disposições e confirmação de nova partida.
- `src/layouts.ts`: disposições da mesa para 2 a 6 jogadores.
- `src/icons.tsx` e `src/hand.ts`: ícones com traço desenhado à mão.
- `src/state.ts`: regras do contador e dados salvos.
