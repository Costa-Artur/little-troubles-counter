# Publicar o LT Counter na Google Play

O GitHub Actions valida o app e usa o EAS Build para gerar e assinar o Android App Bundle (`.aab`). O EAS Submit envia **o mesmo build** à Play Store, e o workflow espera o resultado dos dois serviços. A aprovação e a disponibilidade pública continuam sujeitas à análise do Google, ao acesso à produção da conta e às configurações de publicação gerenciada na Play Console.

## Como a automação funciona

O workflow está em [`.github/workflows/mobile.yml`](../.github/workflows/mobile.yml).

| Evento | Resultado |
| --- | --- |
| Pull request para `dev`, `alpha` ou `prod` que altera `mobile/` ou o workflow | Lint, TypeScript, compatibilidade de dependências Expo e exportação do bundle Android; sem credenciais. |
| Qualquer push em `dev` | Verifica, gera AAB e envia para **teste interno** (`track: internal`). |
| Qualquer push em `alpha` | Verifica, gera AAB e envia para **teste fechado** (`track: alpha`). |
| Qualquer push em `prod` | Verifica, gera AAB e envia para **produção** (`track: production`); também publica o site no GitHub Pages. |
| Execução manual: `verify` | Verifica a autenticação do token Expo e o acesso ao projeto, sem gerar AAB nem enviar à loja. |
| Execução manual: `build-only` | Gera AAB assinado, sem enviar à loja. |
| Execução manual: `bootstrap` na branch `dev` | Gera AAB e envia um **rascunho no teste interno**, para configurar o primeiro lançamento. |
| Execução manual: `release` | Gera AAB e envia ao canal da branch selecionada: `dev` → interno, `alpha` → fechado, `prod` → produção. |

`dev` é a branch padrão do repositório. A antiga `main` foi renomeada para `prod`, preservando o histórico. Desenvolva em `dev`, promova para `alpha` e depois para `prod` por merge ou pull request. Tags não disparam publicação. Todos os canais usam o pacote `pet.nick.ltcounter`, as mesmas credenciais e o contador remoto de versões do EAS.

Nas execuções manuais, selecione `dev`, `alpha` ou `prod`. O modo padrão é `verify`; `release` respeita o canal da branch e `bootstrap` só funciona em `dev`. Os modos manuais funcionam mesmo com os pushes automáticos pausados. Pull requests executam somente a CI; a publicação começa após o merge/push na branch de destino.

Cada branch tem seu próprio grupo de concorrência, para que um push em `prod` não substitua uma execução pendente de `alpha` ou `dev`. Dentro da mesma branch, o GitHub pode substituir uma execução pendente por uma mais recente. O build já iniciado não é cancelado automaticamente.

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
6. Em **Teste fechado**, configure os testadores e os países do canal **Alpha**, cujo identificador da API é `alpha`. Esse canal já existe para o LT Counter. A branch `alpha` envia para ele; canais personalizados com outro identificador precisam de configuração correspondente no serviço de envio.

O primeiro AAB do LT Counter já foi enviado com sucesso como rascunho no teste interno. Conclua as tarefas do app e essa versão na Play Console para permitir os próximos envios com `releaseStatus: completed`. Configure também a disponibilidade do teste fechado e o acesso à produção antes de promover mudanças para esses canais.

O teste interno pode estar disponível enquanto o cadastro geral do app ainda é considerado rascunho pelo Google. Nesse estado, o envio normal para `alpha` com `releaseStatus: completed` é recusado. Para enviar o primeiro AAB ao teste fechado como rascunho, use o perfil `alpha-draft`, reaproveitando o ID do build concluído que aparece no log da CI:

```powershell
# Dentro de mobile/; substitua ID_DO_BUILD pelo UUID exibido no log
npx eas-cli@latest submit --platform android --profile alpha-draft --id ID_DO_BUILD --non-interactive --wait
```

Esse comando não gera outro build e não disponibiliza o rascunho aos testadores. Na Play Console, conclua as tarefas pendentes do painel do app, configure o teste fechado e finalize o envio da versão para análise/liberação conforme indicado pelo Google. Após sair do estado de rascunho, os próximos pushes em `alpha` usam o perfil normal `alpha` com `releaseStatus: completed`.

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
3. Faça commit e push da configuração, incluindo `app.json` com o `projectId` real, `eas.json` e o workflow. O workflow só aparece no menu de execução manual depois de chegar à branch padrão. Execute primeiro o destino `verify` para conferir a autenticação e o acesso do token ao projeto Expo.
4. Para uma configuração inicial, abra **Actions → Android CI and Play Store → Run workflow**, selecione `dev` e o destino **`bootstrap`**. No LT Counter esse primeiro rascunho já foi enviado; use `verify` para conferir o token ou `release` para uma nova versão no canal da branch. O link do AAB aparece no resumo da execução; o log do EAS Submit informa o resultado do envio.
5. Na Play Console, confira o rascunho, conclua as tarefas de configuração e publique a release de teste interno para os testadores.

A documentação atual do Expo permite o primeiro envio com EAS Submit. Se a Play Console exigir um primeiro envio manual ou se você preferir fazê-lo pela interface, execute o destino **`build-only`**, baixe o AAB pelo resumo da execução, envie-o em **Teste interno → Criar versão** e conclua as etapas da loja. Depois use `release` na branch desejada. Não reenvie um AAB cujo `versionCode` já tenha sido utilizado.

## 5. Ativar a publicação contínua

A publicação automática está configurada com a variável de repositório em **Settings → Secrets and variables → Actions → Variables**:

```text
PLAY_STORE_AUTOMATION_ENABLED=true
```

Com a variável ativada, cada push em `dev`, `alpha` ou `prod` gera build e envio ao respectivo canal. Isso inclui merges de pull requests e alterações fora de `mobile/`. Para pausar os envios automáticos, altere a variável para `false` ou remova-a; a CI continua funcionando. A criação inicial das três branches foi feita com os envios pausados; a ativação vale para os próximos pushes.

Exemplo de promoção das mudanças, depois de validar cada etapa e completar as exigências da loja:

```powershell
# Atualize o desenvolvimento
git switch dev
git pull --ff-only

# Promova para o teste fechado
git switch alpha
git pull --ff-only
git merge origin/dev
git push origin alpha

# Depois de validar no teste fechado, promova para produção
git switch prod
git pull --ff-only
git merge origin/alpha
git push origin prod
```

Você também pode promover por pull requests `dev` → `alpha` → `prod`. Se as branches já apontarem para o mesmo commit, um merge não cria atualização e não há novo build; para reenviar, use `Run workflow → release` na branch desejada.

Para uma nova versão visível, altere `expo.version` em `mobile/app.json` (por exemplo, `1.0.1`) em `dev` e promova a mudança. Cada envio gera um AAB novo com `versionCode` único; o fluxo não reutiliza o mesmo AAB entre canais. O perfil de envio `production` usa `track: production` e `releaseStatus: completed`, solicitando distribuição completa após a aprovação do Google. Com publicação gerenciada ativada, ainda será necessário liberar as alterações na Play Console.

## Diagnóstico

- **Projeto não vinculado:** rode `npx eas-cli@latest init` em `mobile/`, confira `expo.owner`/`extra.eas.projectId` e faça commit.
- **Credenciais Android ausentes:** execute o primeiro `eas build` interativo e configure o keystore antes de tentar na CI.
- **Google Service Account Keys cannot be set up in --non-interactive mode:** vincule a chave ao app em `eas credentials --platform android`; a CI não solicita credenciais interativamente.
- **App em rascunho aceita apenas versões em rascunho:** use `bootstrap` em `dev` e conclua o lançamento inicial na Play Console antes de usar `release` ou os pushes automáticos.
- **Esse erro ao enviar para `alpha`:** reaproveite o build com o perfil `alpha-draft`, conforme a seção de configuração da Play Console. Conclua também o cadastro geral do app; a disponibilidade do teste interno não garante que o teste fechado ou a produção já estejam liberados.
- **Teste fechado indisponível:** configure os testadores e a disponibilidade do canal `alpha` na Play Console antes de publicar por essa branch.
- **403 / acesso negado:** confira API habilitada, convite aceito, permissões da conta de serviço para o app e acesso do token Expo à organização.
- **Version code already used:** sincronize o maior código com `eas build:version:set --platform android` e gere outro build.
- **Produção indisponível:** conclua cadastro, testes e pedido de acesso indicados pelo Google. Reexecutar a CI não libera a conta.
- **Build ou envio falhou:** consulte a etapa que falhou no Actions e os logs do Expo. Reexecutar o workflow cria outro build e incrementa o código novamente.

Documentação: [builds em CI](https://docs.expo.dev/build/building-on-ci/), [versões remotas](https://docs.expo.dev/build-reference/app-versions/), [envio Android](https://docs.expo.dev/submit/android/) e [perfis de envio](https://docs.expo.dev/eas/json/#expo-submit).
