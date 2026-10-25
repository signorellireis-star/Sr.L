# 🎧 Guia Rápido: Site Sr.L — Visualização, Google Drive e GitHub Pages

Parabéns! O site **Sr.L** está 100% construído e rodando localmente com os **121 SETs** indexados diretamente do seu acervo.

---

## 1. 🚀 Como Ver o Site no Seu Navegador Agora Mesmo

O servidor local já está ativo na sua máquina. Basta abrir qualquer navegador (Chrome, Edge, Firefox) e acessar:

👉 **[http://localhost:8080/](http://localhost:8080/)**

### O que você vai ver:
- **Hero de Abertura:** Imagem cinematográfica do clube com raios lasers violeta e ciano, título monumental **Sr.L**, equalizador animado e contadores dinâmicos (**121 Sets**, **110h+ de música**, **11 estilos**).
- **Efeito Parallax e Borrão:** Ao rolar a página, o fundo escurece e desfoca suavemente.
- **Seção Sobre:** Efeito que transforma a palavra **Signorelli** em **Sr.L**, acompanhado da foto da cabine com as mãos no mixer.
- **Acervo Completo (121 Cards):** Capas em neon geradas dinamicamente com as cores e formas de cada estilo (Psytrance, Full On, Trance, Electro, etc.).
- **Filtros e Busca Instantâneos:** Chips por gênero no topo e busca por número, nome ou estilo (atalho `/` no teclado).
- **Player Fixo no Rodapé (Estilo SoundCloud):** Ao clicar no Play de qualquer card, o player surge no rodapé com onda sonora, controles de Play/Pause, avançar/voltar 30s, volume e atalho de espaço para pausar.
- **Tracklist Expansível:** Mostra `Sem SET list informado` com design elegante até você preencher as faixas.

> **Dica:** Para parar o servidor local quando quiser, basta fechar o terminal ou me avisar por aqui. Para reabri-lo futuramente:  
> `powershell -ExecutionPolicy Bypass -File tools\server.ps1 -Port 8080`

---

## 2. ☁️ Vinculando os Links de Download do Google Drive

Para que os botões de **Baixar (MP3)** e a reprodução funcionem com os arquivos que estão na sua pasta do Google Drive:

### Passo A — Extrair os IDs da Pasta do Drive
1. Abra uma planilha vazia no [Google Planilhas](https://sheets.new).
2. Vá no menu **Extensões** → **Apps Script**.
3. Apague o que estiver lá e cole o código abaixo:

```javascript
function extrairLinksSets() {
  // Substitua pelo ID da sua pasta do Google Drive (está no link da pasta)
  var pastaId = "COLE_O_ID_DA_SUA_PASTA_AQUI"; 
  var pasta = DriveApp.getFolderById(pastaId);
  var arquivos = pasta.getFiles();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  sheet.clear();
  sheet.appendRow(["Nome_Arquivo", "ID_Google_Drive"]);
  
  while (arquivos.hasNext()) {
    var file = arquivos.next();
    sheet.appendRow([file.getName(), file.getId()]);
  }
}
```
4. Clique em **Executar**. A planilha será preenchida em segundos com os 121 arquivos e seus respectivos IDs.
5. No Google Planilhas, vá em **Arquivo** → **Fazer download** → **Valores separados por vírgula (.csv)**.
6. Salve o arquivo como `links.csv` nesta pasta do projeto.

### Passo B — Sincronizar com o Site
Depois de salvar o CSV, me avise ou rode:
```powershell
powershell -ExecutionPolicy Bypass -File tools\gerar_dados.ps1 -IdsCsv "links.csv" -SkipCovers
```
Pronto! Todos os 121 cards receberão seus links diretos de download.

---

## 3. 🌐 Como Publicar no GitHub Pages (`signorellireis-star/Sr.L`)

Seu repositório já existe: `https://github.com/signorellireis-star/Sr.L`.

Como sua máquina ainda não tem o **Git** instalado no terminal, o processo mais rápido é:

### Opção 1: Deixar que eu instale o Git via `winget` (Recomendado)
Se você autorizar, eu mesmo executo:
```powershell
winget install --id Git.Git -e --source winget
```
E em seguida inicializo o repositório, comito os arquivos e faço o push para o seu repositório.

### Opção 2: Pelo GitHub Desktop ou Navegador
1. Acesse seu repositório: `https://github.com/signorellireis-star/Sr.L`
2. Arraste todos os arquivos desta pasta para lá.

### Ativando o GitHub Pages (no site do GitHub):
1. No seu repositório no GitHub, clique na aba superior **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Build and deployment** → **Source**, escolha **Deploy from a branch**.
4. Abaixo, selecione a branch `main` e a pasta `/ (root)`.
5. Clique em **Save**.
6. Em cerca de 1 a 2 minutos, seu site estará no ar no endereço oficial:  
   🔗 **`https://signorellireis-star.github.io/Sr.L/`**

---

## 4. 🔄 Como Faremos Atualizações Futuras

Sempre que você quiser:
- **Adicionar a tracklist de um set:** Você só me manda aqui: *"Coloque a tracklist do SET 10: 01. Faixa A, 02. Faixa B..."*
- **Adicionar um set novo (ex: SET 124):** Você coloca o arquivo na pasta e eu atualizo o catálogo.
- **Alterar redes sociais:** Podemos editar o arquivo `js/config.js` onde você coloca seu Instagram, Soundcloud, etc.

Eu atualizo os arquivos locais e comito diretamente para o GitHub para você!
