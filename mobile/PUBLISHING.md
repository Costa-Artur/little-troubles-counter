# Publicar o LT Counter na Google Play

O GitHub Actions valida o app e usa o EAS Build para gerar e assinar o Android App Bundle (`.aab`). O EAS Submit envia **o mesmo build** à Play Store, e o workflow espera o resultado dos dois serviços. A aprovação e a disponibilidade pública continuam sujeitas à análise do Google, ao acesso à produção da conta e às configurações de publicação gerenciada na Play Console.

## Como a automação funciona

O workflow está em [`.github/workflows/mobile.yml`](../.github/workflows/mobile.yml).

| Evento | Resultado |
| --- | --- |
| Pull request que altera `mobile/` ou o workflow | Lint, TypeScript, compatibilidade de dependências Expo e exportação do bundle Android; sem credenciais. |
| Push na `main` que altera esses arquivos | Mesmas verificações; com a automação ativada, gera AAB e envia para **teste interno**. |
| Push da tag `android-vX.Y.Z` | Verifica, gera AAB e envia para **produção**; exige automação ativada, versão igual à de `app.json` e commit presente na `main`. |
| Execução manual: `build-only` | Gera AAB assinado, sem enviar à loja. |
| Execução manual: `bootstrap` | Gera AAB e envia um **rascunho no teste interno**, para configurar o primeiro lançamento. |
| Execução manual: `internal` | Gera AAB e disponibiliza para os testadores internos configurados na Play Console. |
| Execução manual: `production` | Gera AAB e envia para produção; o commit precisa estar na `main`. |

As execuções manuais funcionam antes de ativar os pushes automáticos. Para elas, selecione a branch `main` no GitHub. Em uma tag `android-v*`, o destino é sempre produção. O workflow não publica a partir de pull requests.

Os envios compartilham um grupo de concorrência para evitar publicações simultâneas. O GitHub pode substituir uma execução pendente por uma mais recente; a CI não é uma fila que garante a publicação de cada commit. Evite disparar várias releases enquanto outra está pendente.

## 1. Vincular o projeto ao Expo

O projeto já está vinculado a **[`@wcrdesign/lt-counter`](https://expo.dev/accounts/wcrdesign/projects/lt-counter)**, com o ID `4b9ca154-9f9f-433f-946e-cdcdf9b911aa`. A assinatura Android e o contador remoto de versões também foram configurados no Expo. Para verificar o vínculo em outra máquina:

```powershell
cd mobile
npm ci
npx eas-cli@latest login
npx eas-cli@latest project:info
```

Os comandos abaixo são referência para uma nova configuração; não é necessário repetir o `init` neste projeto. Use uma conta com permissão para criar projetos e builds na organização. Na raiz do repositório:

```powershell
cd mobile
npm ci
npx eas-cli@latest login
npx eas-cli@latest init
```

O `init` cria ou vincula o projeto `lt-counter` e grava o identificador real em `expo.extra.eas.projectId` de `app.json`. Se esse campo já estiver preenchido, confira o projeto com `npx eas-cli@latest project:info`; não crie outro projeto. O pacote Android configurado é **`pet.nick.ltcounter`**: mantenha o mesmo identificador na Play Store.

O [primeiro build](https://expo.dev/accounts/wcrdesign/projects/lt-counter/builds/f3cdc81d-29dd-4712-ba5c-e039f51762ab) já foi solicitado para este projeto e o keystore já foi criado. Confira o resultado nesse link. Para solicitar outro build pelo terminal, o comando é:

```powershell
npx eas-cli@latest build --platform android --profile production
```

Em uma nova configuração, quando solicitado, permita que o EAS gere e armazene o keystore Android. Esse passo prepara a assinatura usada pelas execuções não interativas. Neste projeto, reutilize o keystore já configurado. Guarde um backup seguro da chave pelo painel de credenciais do Expo e mantenha a mesma chave de upload nas próximas versões.

O `eas.json` usa `appVersionSource: remote` e `autoIncrement: true`. O EAS controla e incrementa o `versionCode` a cada build de produção, inclusive os destinados ao teste interno. O contador já foi inicializado no Expo; não é necessário manter `android.versionCode` em `app.json`. A versão visível (`expo.version`) continua sendo alterada no Git antes de uma release. Para migrar um app que já tenha versões na loja, use `npx eas-cli@latest build:version:set --platform android` e inicialize com o maior `versionCode` já utilizado.

## 2. Criar a conta e o app na Play Console

1. Cadastre a conta de desenvolvedor na [Google Play Console](https://play.google.com/console/signup) e conclua o pagamento, a verificação de identidade e as verificações de dispositivo, quando exigidas.
2. Crie um app chamado **LT Counter** e escolha o idioma principal, a distribuição e a categoria apropriados. Use o pacote `pet.nick.ltcounter` no primeiro AAB.
3. Preencha a página da loja, os dados de contato, política de privacidade, segurança dos dados, acesso ao app, anúncios, público-alvo e classificação indicativa conforme o comportamento real do aplicativo.
4. Prepare o ícone 512 × 512 (já existe em `store/play-store-icon-512.png`), a imagem de destaque 1024 × 500 e as capturas de tela exigidas pela loja. A política de privacidade precisa estar em uma URL pública.
5. Configure os testadores e o link de adesão em **Teste interno**. O primeiro rascunho precisa ser concluído na Play Console para ficar disponível aos testadores.

Contas pessoais novas podem precisar de teste fechado antes de pedir acesso à produção. Confira os requisitos exibidos na sua Play Console: **teste interno não substitui teste fechado**. A CI pode enviar para teste interno enquanto o acesso à produção ainda não estiver liberado. [Requisitos de testes do Google](https://support.google.com/googleplay/android-developer/answer/14151465).

## 3. Autorizar o EAS a enviar para o Google Play

Siga o [guia oficial do Expo para criar a conta de serviço Google](https://expo.fyi/creating-google-service-account):

1. Crie ou selecione um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a **Google Play Android Developer API** (`androidpublisher.googleapis.com`).
3. Crie uma conta de serviço e uma chave **JSON**. Salve o arquivo fora do repositório.
4. Na Play Console, em **Usuários e permissões**, convide o e-mail da conta de serviço. Restrinja o acesso ao LT Counter e conceda as permissões indicadas pelo guia: visualizar informações, editar apps em rascunho, lançar em testes, gerenciar testes, lançar em produção e gerenciar presença na loja.
5. Envie a chave ao **EAS Submit**, vinculada ao pacote Android deste app:

```powershell
# Execute em mobile/
npx eas-cli@latest credentials --platform android
```

Escolha o perfil `production`, depois **Google Service Account** → **Manage your Google Service Account Key for Play Store Submissions** → **Set up a Google Service Account Key for Play Store Submissions**, e informe o caminho do JSON. Também é possível fazer isso no projeto Expo: **Credentials → Android → pet.nick.ltcounter → Google service account key for Expo Submit**.

A chave fica armazenada no Expo, assim como o keystore. Não é necessário colocar o JSON nos secrets do GitHub nem configurar `serviceAccountKeyPath` em `eas.json`. O token Expo usado na CI precisa de acesso aos builds e às credenciais de envio da organização.

## 4. Configurar o GitHub e fazer o primeiro envio

1. Crie um [token de acesso Expo](https://expo.dev/settings/access-tokens) para uma conta com acesso à organização `wcrdesign`.
2. No [repositório GitHub](https://github.com/nickowolf/little-troubles-counter/settings/secrets/actions), abra **Settings → Secrets and variables → Actions → Secrets** e crie o secret **`EXPO_TOKEN`** com esse token.
3. Faça commit e push da configuração, incluindo `app.json` com o `projectId` real, `eas.json` e o workflow. O workflow só aparece no menu de execução manual depois de chegar à branch padrão.
4. Abra **Actions → Android CI and Play Store → Run workflow**, selecione `main` e o destino **`bootstrap`**. O link do AAB aparece no resumo da execução; o log do EAS Submit informa o resultado do envio.
5. Na Play Console, confira o rascunho, conclua as tarefas de configuração e publique a release de teste interno para os testadores.

A documentação atual do Expo permite o primeiro envio com EAS Submit. Se a Play Console exigir um primeiro envio manual ou se você preferir fazê-lo pela interface, execute o destino **`build-only`**, baixe o AAB pelo resumo da execução, envie-o em **Teste interno → Criar versão** e conclua as etapas da loja. Depois use `internal` nas próximas execuções. Não reenvie um AAB cujo `versionCode` já tenha sido utilizado.

## 5. Ativar a publicação contínua

Depois de confirmar que o envio `internal` funciona, abra **Settings → Secrets and variables → Actions → Variables** e crie a variável de repositório:

```text
PLAY_STORE_AUTOMATION_ENABLED=true
```

Com a variável ativada, alterações em `mobile/` ou no workflow enviadas à `main` geram builds para **teste interno**. Releases públicas são disparadas por tags. Para desativar os envios automáticos, altere a variável para `false` ou remova-a; a CI continua funcionando.

Para publicar a versão inicial em produção, depois de obter acesso à produção e completar as exigências da loja:

```powershell
# Na raiz do repositório, depois que a configuração estiver na main remota
git switch main
git pull --ff-only
git tag android-v1.0.0
git push origin android-v1.0.0
```

Para versões seguintes, altere `expo.version` em `mobile/app.json` (por exemplo, `1.0.1`), faça commit e push para `main` e envie a tag correspondente (`android-v1.0.1`). A CI rejeita tags que não correspondam à versão configurada. O perfil de envio `production` usa `track: production` e `releaseStatus: completed`, solicitando distribuição completa após a aprovação do Google. Com publicação gerenciada ativada, ainda será necessário liberar as alterações na Play Console.

## Diagnóstico

- **Projeto não vinculado:** rode `npx eas-cli@latest init` em `mobile/`, confira `expo.owner`/`extra.eas.projectId` e faça commit.
- **Credenciais Android ausentes:** execute o primeiro `eas build` interativo e configure o keystore antes de tentar na CI.
- **Google Service Account Keys cannot be set up in --non-interactive mode:** vincule a chave ao app em `eas credentials --platform android`; a CI não solicita credenciais interativamente.
- **App em rascunho aceita apenas versões em rascunho:** use `bootstrap` e conclua o lançamento inicial na Play Console antes de usar `internal`/`production`.
- **403 / acesso negado:** confira API habilitada, convite aceito, permissões da conta de serviço para o app e acesso do token Expo à organização.
- **Version code already used:** sincronize o maior código com `eas build:version:set --platform android` e gere outro build.
- **Produção indisponível:** conclua cadastro, testes e pedido de acesso indicados pelo Google. Reexecutar a CI não libera a conta.
- **Build ou envio falhou:** consulte a etapa que falhou no Actions e os logs do Expo. Reexecutar o workflow cria outro build e incrementa o código novamente.

Documentação: [builds em CI](https://docs.expo.dev/build/building-on-ci/), [versões remotas](https://docs.expo.dev/build-reference/app-versions/), [envio Android](https://docs.expo.dev/submit/android/) e [perfis de envio](https://docs.expo.dev/eas/json/#expo-submit).
