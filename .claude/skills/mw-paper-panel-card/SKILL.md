---
name: mw-paper-panel-card
description: >-
  Mexer no painel de papel do Home Assistant (custom:mw-paper-panel-card) — o
  card que guarda OUTROS cards em pilha, fileira ou grade, com divisórias.
  Use quando o Maycon falar em "painel de papel", "MW Paper Panel", "quero
  vários cards dentro de um card", "põe esses botões lado a lado", "uma grade
  de cards", "linha divisória entre os cards", "o card de dentro não aparece",
  "o card de dentro ficou com moldura", "o span não funciona", "o picture-
  elements dentro do painel", "põe uma foto de fundo no card", "quero mais
  volume/3D", "o relevo sumiu por cima da imagem", "estilo pronto", "preset",
  "aba numerada", "faixa lateral", "cabeçalho colorido", "vidro fosco",
  ou quando pedir foto/exemplo novo para o README deste repositório.
---

# MW Paper Panel Card

`custom:mw-paper-panel-card` — arquivo único **sem build**:
`dist/mw-paper-panel-card.js` é fonte **e** artefato. Repo público
`visaodeempresa/mw-ha-paper-panel-card`.

## Pré-condições

- Ler o bundle inteiro antes de imitar qualquer coisa — ele é o contrato.
- Blocos embutidos byte a byte: `paper-palette v1` e `paper-dark-palette v1`
  (canônicos em `IA/lib/`). Rodar `IA/tools/check-embeds.sh` antes de commitar.
- Este é um card **hospedeiro**: valem as regras de
  `IA/knowledge/ha-lovelace-cards.md` §"Card que hospeda outros cards".

## Armadilhas (com o sintoma que você vai ver)

| sintoma | causa | conserto |
|---|---|---|
| os cards de dentro somem ao mexer numa cor | alguém reescreveu `shadowRoot.innerHTML` depois de montado | montar uma vez em `_ensureDom`; depois só variáveis CSS e classes |
| card de dentro congela ao trocar de tipo | `ll-rebuild` não escutado | ver `_createCard`: o listener recria **aquele** filho e atualiza `_cardEls` |
| card de dentro não atualiza de estado | `hass` não desceu | `set hass` percorre `_cardEls` a cada set, sempre |
| `visibility:` num card de dentro não esconde nada | quem aplica é o `hui-card` do HA, e ele não está neste caminho | usar `type: conditional` em volta |
| card de dentro aparece com moldura dupla | `flat_children` desligado, ou seletor `.slot ha-card` (não atravessa shadow) | achatar por variável de tema: `--ha-card-background`, `--ha-card-box-shadow`, `--ha-card-border-width` |
| span maior que a grade estoura a linha | `grid-column: span N` sem aparo | `_applySpan` apara por `Math.min(cols, c.columns)` |
| peso de altura na pilha "não faz nada" | contêiner de altura automática — `flex-grow` não tem o que repartir | `panel_min_height`, ou seção com altura fixa |
| a foto do README sai sem ícone | o dublê da bancada lê o **atributo** `icon`; o HA aceita propriedade | `_paintHeader` grava propriedade **e** atributo |
| ícone do cabeçalho enorme na bancada | o `<svg>` do dublê preenche a caixa; `--mdc-icon-size` só existe no HA | `width`/`height` explícitos no CSS do `.hdr ha-icon` |
| `TypeError: ….in is not a function` vindo do `setConfig` | **crase em comentário dentro de bloco de estilo** fecha o template literal | nunca usar crase em comentário dentro de template literal |
| a foto cobre o relevo e o card fica chapado | imagem posta como `background` da caixa | a imagem é CAMADA (`.bg`) e o relevo vive em `.emboss`, por cima dela |
| o relevo vira névoa branca por cima da foto | a luz do papel (branco 0,90) foi calibrada para folha creme | `background_relief` nasce em `soft` (0,45); `full` devolve a luz cheia |
| a foto desfocada fica com borda vazia | o borrão puxa o transparente de fora para dentro | `--bgscale` amplia a camada junto com o desfoque |
| aspa na URL da imagem quebra o CSS do card inteiro | `url()` fechado pela aspa do dono | `cssUrl()` escapa `\` e `"`, e recusa `javascript:` |
| aumentar o volume escurece o card em vez de dar volume | escalaram a OPACIDADE da sombra | `volume` multiplica só a geometria; em 1 a saída é byte a byte a de antes |
| a banda colada deixa quina quadrada no papel arredondado | raio do acento ignorando o raio do painel | modo `inside` calcula o raio por lado a partir de `panel_radius` |
| o medalhão senta em cima do primeiro card | conteúdo sem recuo | `_paintAccent` empurra a pilha quando há medalhão no topo |
| trocar de `preset` não muda nada | chave do dono ganha do preset, por desenho | é isso mesmo: apague a chave no YAML para o preset voltar a mandar |
| editor perde o foco a cada tecla | o editor foi recriado ao gravar | `_writeCard` só atualiza os rótulos da lista |
| span escolhido some ao editar o card | o editor do HA devolve a config sem `grid_options` | `_writeCard` preserva o `grid_options` anterior |

## Verificação

```bash
node --check dist/mw-paper-panel-card.js
node tools/probe.js          # esperado: "✓ probe: 103 verificações passaram"
python3 -m http.server 8777  # bancada em /tools/preview.html (HTTP, não file://)
tools/shots.sh               # refaz docs/*.png
```

O probe cobre arranjos, span, divisórias, pseudo-cards, `hass`/`ll-rebuild`,
relevo claro e de noite, volume, imagem de fundo (camadas, véus, escape da
URL, relevo por cima), achatamento dos filhos e a regra de default que não
polui o YAML. **Mudança de aparência o probe não vê** — tem que olhar a
bancada nos dois fundos (botão «alternar fundo claro/escuro»).

`tools/shots.sh` procura o Chrome; se não houver, usa o
`chrome-headless-shell` em `~/.local/lib/mw-bench/` (instalar com
`npx -y @puppeteer/browsers install chrome-headless-shell@stable`). **Não**
guardar o binário em `/Volumes` — volume externo some e o binário some junto.

## Fora do repositório

DevOps padrão (`IA/tools/mw-devops.sh apply|github`), marca
(`IA/tools/mw-brand.sh pr`), `repos.tsv` e rulesets entram **depois** da
validação do dono. Até lá o repo não tem CI nem release.
