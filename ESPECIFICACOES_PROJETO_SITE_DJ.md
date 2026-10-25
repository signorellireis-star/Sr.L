# 🎧 Especificações do Projeto: Site de SETs de DJ

> **Documento de Briefing, Arquitetura e Regras de Implementação**  
> *Pronto para uso no Antigravity com qualquer modelo (Gemini, Claude, etc.).*

---

## 1. Visão Geral do Projeto

Criação de um site de alta performance e visual impactante para um DJ de música eletrônica disponibilizar seu acervo de **aproximadamente 120 SETs** gravados ao longo de vários anos.

O foco central da experiência é permitir que os visitantes:
1. Naveguem e filtrem a discografia de SETs com facilidade.
2. Ouçam prévias ou o set completo via player de áudio integrado.
3. Consultem a tracklist (músicas que compõem o set).
4. **Baixem individualmente** apenas o SET de seu interesse com 1 clique (sem downloads em lote obrigatórios).

---

## 2. Regras Fundamentais de Negócio

* [x] **Download Individual e Exclusivo:** Cada SET deve ter seu próprio link de download independente. O usuário escolhe pontualmente o set que quer baixar.
* [x] **Zero Trabalho Manual de Links para o DJ:** O DJ não irá gerar 120 links manuais. Os 120 arquivos serão colocados em uma única pasta pública no Google Drive, e os IDs/links serão extraídos de forma automatizada.
* [x] **Experiência Premium de DJ:** Estética moderna, sofisticada, estilo *Club / Dark Mode*, com animações suaves e tipografia marcante.
* [x] **Filtros e Busca em Tempo Real:** Permitir filtrar 120 itens instantaneamente por gênero musical, ano e busca textual.

---

## 3. Arquitetura do Google Drive & Automação

### A. Política de Compartilhamento da Pasta
1. O DJ cria uma pasta mãe no Google Drive (ex: `SETs DJ Acervo`).
2. Configura a permissão de compartilhamento da pasta mãe para:  
   **"Qualquer pessoa com o link pode ver"**.
3. Todos os 120 arquivos inseridos herdam automaticamente a permissão pública de download.

### B. Formatação dos Links de Download Direto
Para evitar redirecionamentos desnecessários, os links gerados para o botão de download devem seguir o padrão de download direto:
```text
https://drive.google.com/uc?export=download&id=ID_DO_ARQUIVO_NO_DRIVE
```

### C. Script para Extração Automática dos 120 Links (Google Apps Script)
Para extrair todos os 120 nomes e links em 10 segundos, o DJ pode abrir o Google Planilhas -> *Extensões* -> *Apps Script* e rodar:

```javascript
function extrairLinksSets() {
  var pastaId = "COLE_O_ID_DA_SUA_PASTA_AQUI"; 
  var pasta = DriveApp.getFolderById(pastaId);
  var arquivos = pasta.getFiles();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  sheet.clear();
  sheet.appendRow(["Nome_Arquivo", "ID_Google_Drive", "Link_Download_Direto"]);
  
  while (arquivos.hasNext()) {
    var file = arquivos.next();
    var id = file.getId();
    var nome = file.getName();
    var downloadLink = "https://drive.google.com/uc?export=download&id=" + id;
    sheet.appendRow([nome, id, downloadLink]);
  }
}
```

---

## 4. Design & Identidade Visual (UI/UX)

* **Paleta de Cores:**
  * Fundo principal: Deep Dark / Preto grafite (`#0b0c10` / `#121216`).
  * Superfícies/Cards: Glassmorphism suave com bordas sutis neon (`rgba(255, 255, 255, 0.05)`).
  * Acentos de Destaque: Neon Ciano / Violeta Elétrico / Âmbar Quente.
* **Tipografia:**
  * Display/Títulos: *Syne*, *Outfit* ou *Space Grotesk*.
  * Textos e Metadados: *Inter* ou *Plus Jakarta Sans*.
* **Micro-animações:**
  * Efeito de pulso de waveform ao reproduzir um set.
  * Transições suaves nos cards ao passar o cursor (*hover 3D tilt* / brilho sutil de borda).

---

## 5. Estrutura de Componentes da Página

1. **Header / Hero Section:**
   * Nome artístico do DJ e logotipo/insígnia.
   * Bio curta e impacto visual (contador: *120+ Sets | 10+ Anos de Pista*).
   * Redes sociais (Instagram, Soundcloud, YouTube, Spotify).
2. **Barra de Controle (Busca & Filtros):**
   * Campo de busca rápida (*"Buscar por nome, faixa da tracklist..."*).
   * Filtro por Gênero (ex: *Todos, Melodic Techno, Progressive House, Deep House, Indie Dance*).
   * Ordenação (Mais recentes, Mais ouvidos, Ano).
3. **Grade de SETs (120 Cards Responsivos):**
   * Capa estilizada ou visualizador de waveform.
   * Título do SET, Ano, Duração (ex: `1h 45m`) e Tags de Gênero.
   * **Player de Áudio:** Botão Play/Pause embutido no card.
   * **Acordeão de Tracklist:** Botão *"Ver Tracklist"* que desliza para mostrar a lista de faixas do set.
   * **Botão de Download Individual:** Botão destacado (*"Baixar SET (MP3)"*) apontando diretamente para o arquivo daquele card.
4. **Player de Rodapé Persistente (Sticky Audio Player):**
   * Ao dar Play em qualquer card, uma barra fixa no rodapé mantém a reprodução contínua enquanto o usuário navega e explora outros sets.

---

## 6. Modelo de Dados (JSON Schema)

Os dados dos 120 sets devem ser organizados em um arquivo centralizado (`sets-data.json`) para facilitar atualizações futuras:

```json
[
  {
    "id": 1,
    "title": "Sunset Melodic Session Vol. 01",
    "year": 2024,
    "genre": "Melodic Techno",
    "duration": "1:24:10",
    "bpm": "124 BPM",
    "fileId": "1a2b3c4d5e6f7g8h9",
    "downloadUrl": "https://drive.google.com/uc?export=download&id=1a2b3c4d5e6f7g8h9",
    "streamUrl": "https://docs.google.com/uc?export=open&id=1a2b3c4d5e6f7g8h9",
    "coverImage": "assets/covers/set-01.jpg",
    "tracklist": [
      "01. Artist A - Track Name (Original Mix)",
      "02. Artist B - Another Track (Remix)",
      "03. Artist C - Deep Vibes (Club Edit)"
    ]
  }
]
```

---

## 7. Próximos Passos para o Modelo Argon

1. Ler este arquivo [`ESPECIFICACOES_PROJETO_SITE_DJ.md`](file:///c:/Users/Felipe_Reis/Documents/01.Antigravity/01.Criacao_SITE_SETS/ESPECIFICACOES_PROJETO_SITE_DJ.md).
2. Gerar a estrutura do site (HTML semântico, Vanilla CSS ultra moderno e JavaScript modular para renderizar os cards dinamicamente do JSON).
3. Conectar a lista dos 120 links extraídos do Google Drive ao array de dados.


## Melhorias que pensei agora
Na pasta do projeto existe uma Planilha .MD com a explicação ínicial.
Leia e veja se entende, mas não execute nada ainda. Vamos conversar.
Eu queri implementar no site um botão em que o usuário possa escutar o set enquanto está logado no site.
1. Um botão tipo o soundcloud. Veja se é possivel colocar no meu site.
2. Eu ainda não possuo todos os SETs lists, então, enquanto eu não te passar o set list., Deixe na parte de informações. "Sem SET list informado"
3. Eu pretendo carregar o site no github para eu poder compartilhar o site em sites de música eletrônica.
4. O meus sets, eu não tenho as informações históricas como "quando o set foi criado" Como são SETs que faz anos que fiz, eu perdi as informações. Eu não consegui incluir em metadados.
5. No meta dados, existem imagens da capa do SET. Talvez algum não tenha. Crie uma Capa para incluir. Vique a vontade para ser criativo.
5. Depois que criar projeto, e eu precisar fazer atualização, eu te passo por aqui e atualizamos no GitHub. Preciso lembrar como faço para carregar no github e habilitar o pages. Você precisará me orientar. Meu repositório é: https://github.com/signorellireis-star/Sr.L
6. Se puder conecte via MCP