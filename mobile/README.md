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

A configuração já está pronta em `app.json` e `eas.json`:

- Pacote Android: `com.costaartur.ltcounter` (troque antes do primeiro envio se quiser outro; depois de publicado ele não muda mais).
- Nome no aparelho: **LT Counter**. Versão `1.0.0`, `versionCode` 1, que sobe sozinho a cada build de produção.
- Ícones (normal, adaptativo e monocromático), tela de abertura e ícone 512×512 da loja em `store/`.

Passos:

1. Crie uma conta gratuita em [expo.dev](https://expo.dev) e entre pelo terminal:
   ```powershell
   npx eas-cli@latest login
   ```
2. Ligue o projeto à sua conta (só na primeira vez):
   ```powershell
   npx eas-cli@latest init
   ```
3. Gere um APK de teste para instalar direto no celular:
   ```powershell
   npx eas-cli@latest build -p android --profile preview
   ```
4. Gere o pacote da loja (.aab):
   ```powershell
   npx eas-cli@latest build -p android --profile production
   ```
   O EAS cria e guarda a chave de assinatura do app para você.
5. Na [Play Console](https://play.google.com/console) (conta de desenvolvedor do Google, taxa única), crie o app e **envie o primeiro .aab manualmente** em "Teste interno". O Google exige esse primeiro envio pela página.
6. Envios seguintes podem ir pelo terminal com `npx eas-cli@latest submit -p android --profile production`. Antes, crie uma chave de conta de serviço do Google e configure-a no EAS (veja a documentação "Submit to Google Play" do Expo).

### O que a Play Console vai pedir

- **Política de privacidade**: o app não coleta nem envia dados (tudo fica no aparelho), mas a loja exige um link. Uma página simples (por exemplo no GitHub Pages) resolve.
- **Segurança dos dados**: responda que nenhum dado é coletado nem compartilhado.
- **Classificação indicativa**: questionário rápido.
- **Página da loja**: ícone 512×512 (`store/play-store-icon-512.png`), imagem de destaque 1024×500 e pelo menos 2 capturas de tela do celular.
- **Nome e marca**: "Little Troubles" é marca dos criadores do jogo. Para um app de fãs, deixe claro na descrição que é **não oficial**, ou peça autorização a eles.

## Estrutura

- `App.tsx`: estado da partida, salvamento, sorteio de quem começa, mesa e botão central.
- `src/Panel.tsx`: painel de cada jogador (toque/segurar, lutas, vitória).
- `src/Drawers.tsx`: ajustes do jogador e carta de Objetivo.
- `src/Menu.tsx`: menu, dados, disposições e confirmação de nova partida.
- `src/layouts.ts`: disposições da mesa para 2 a 6 jogadores.
- `src/icons.tsx` e `src/hand.ts`: ícones com traço desenhado à mão.
- `src/state.ts`: regras do contador e dados salvos.
