/* Probe headless do mw-paper-panel-card — instancia card e editor fora do
 * navegador (shim de DOM feito à mão, sem dependência) e verifica o que uma
 * foto não prova: arranjo (pilha/fileira/grade), span por card, divisórias
 * automáticas e explícitas, pseudo-cards que NÃO vão para o loadCardHelpers,
 * hass repassado aos filhos, ll-rebuild, relevo claro/escuro e a regra de
 * default que não polui o YAML.
 *
 * Rodar: node tools/probe.js   (sai 1 se alguma verificação falhar)
 */
const fs = require("fs");
const path = require("path");

/* ------------------------------- shim DOM ------------------------------- */

const mkStyle = () => {
  const s = { _p: {} };
  s.setProperty = (k, v) => { s._p[k] = String(v); };
  s.removeProperty = (k) => { delete s._p[k]; };
  s.get = (k) => s._p[k];
  return s;
};

class Node {
  constructor(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.style = mkStyle();
    this.children = [];
    this.dataset = {};
    this._attrs = {};
    this._listeners = {};
    this._q = new Map();
    this._classes = new Set();
    this.innerHTML = "";
    this.textContent = "";
    this.hidden = false;
    this.classList = {
      add: (c) => this._classes.add(c),
      remove: (c) => this._classes.delete(c),
      contains: (c) => this._classes.has(c),
      toggle: (c, on) => (on === undefined
        ? (this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c))
        : (on ? this._classes.add(c) : this._classes.delete(c))),
    };
  }
  appendChild(n) { this.children.push(n); n.parentNode = this; return n; }
  append(...n) { n.forEach((x) => this.appendChild(x)); }
  insertBefore(n, ref) {
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) this.children.push(n); else this.children.splice(i, 0, n);
    n.parentNode = this;
    return n;
  }
  replaceChild(nw, old) {
    const i = this.children.indexOf(old);
    if (i >= 0) this.children[i] = nw;
    nw.parentNode = this;
  }
  removeChild(n) { this.children = this.children.filter((c) => c !== n); }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; }
  addEventListener(t, f) { (this._listeners[t] = this._listeners[t] || []).push(f); }
  removeEventListener() {}
  dispatchEvent(ev) { (this._listeners[ev && ev.type] || []).forEach((f) => f(ev)); return true; }
  // memoiza por seletor: o código só consulta seletores fixos
  querySelector(sel) {
    if (!this._q.has(sel)) this._q.set(sel, new Node("div"));
    return this._q.get(sel);
  }
  querySelectorAll() { return []; }
  getElementById(id) { return this.querySelector("#" + id); }
  focus() {}
}

global.Node = Node;
global.HTMLElement = class extends Node {
  attachShadow() { this.shadowRoot = new Node("shadow-root"); return this.shadowRoot; }
};
global.CustomEvent = class {
  constructor(type, init) { this.type = type; Object.assign(this, init || {}); }
};
const reg = {};
global.customElements = {
  define: (n, c) => { reg[n] = c; },
  get: (n) => reg[n],
  whenDefined: () => Promise.resolve(),
};
global.document = { createElement: (t) => new Node(t), body: new Node("body") };
// no Node 24 `navigator` é getter-only: define por cima, não por atribuição
Object.defineProperty(global, "navigator", { value: { vibrate: () => {} }, configurable: true });

// helpers de bolso: os "cards de dentro" viram nós marcados
global.window = {
  customCards: [],
  localStorage: { _v: {}, getItem(k) { return k in this._v ? this._v[k] : null; }, setItem(k, v) { this._v[k] = v; } },
  dispatchEvent: () => {},
  loadCardHelpers: async () => ({
    createCardElement(cfg) {
      const el = new Node("div");
      el._cfg = cfg;
      el.getCardSize = () => 2;
      return el;
    },
  }),
};

// fragmento: o card monta tudo fora da árvore e injeta de uma vez
global.document.createDocumentFragment = () => { const f = new Node("fragment"); f._frag = true; return f; };
const _append = Node.prototype.appendChild;
Node.prototype.appendChild = function (n) {
  if (n && n._frag) { n.children.forEach((c) => _append.call(this, c)); n.children = []; return n; }
  return _append.call(this, n);
};

const infoBanner = [];
const realInfo = console.info;
console.info = (...a) => infoBanner.push(a.join(" "));

/* --------------------------------- carga -------------------------------- */

const SRC = path.join(__dirname, "..", "dist", "mw-paper-panel-card.js");
const CODE = fs.readFileSync(SRC, "utf8");
eval(CODE);
console.info = realInfo;

/* ------------------------------- asserções ------------------------------ */

let pass = 0; const fails = [];
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — não achei ${JSON.stringify(needle)}`);

const Card = customElements.get("mw-paper-panel-card");
const Editor = customElements.get("mw-paper-panel-card-editor");

const mk = async (cfg) => {
  const el = new (Card)();
  el.setConfig(cfg);
  el.hass = { states: {}, callService() {} };
  await el._mountItems();          // montagem é async (loadCardHelpers)
  return el;
};
const stack = (el) => el.shadowRoot.querySelector(".stack");
const vars = (el) => el.shadowRoot.querySelector(".shell").style._p;
const style = (el) => el.shadowRoot.getElementById("mw-style").textContent;
const cls = (n) => String(n.className || "").split(/\s+/);
const slots = (el) => stack(el).children.filter((n) => cls(n).includes("slot"));
const seps = (el) => stack(el).children.filter((n) => String(n.className || "").startsWith("sep"));

(async () => {

/* 1. registro, banner e cartão de visita do HACS */
ok(!!Card, "mw-paper-panel-card não foi registrado");
ok(!!Editor, "mw-paper-panel-card-editor não foi registrado");
ok(/%c v?\d+\.\d+\.\d+ /.test(infoBanner.join(" ")), "banner de versão fora do formato que o release procura");
ok(window.customCards.some((c) => c.type === "mw-paper-panel-card" && c.preview === true),
  "o card não se anuncia em window.customCards com preview");
ok(typeof Card.getConfigElement === "function" && typeof Card.getStubConfig === "function",
  "faltam getConfigElement/getStubConfig (o HA precisa dos dois para o editor visual)");

/* 2. config inválida grita, config vazia não quebra */
let threw = false;
try { new Card().setConfig(null); } catch (_) { threw = true; }
ok(threw, "setConfig(null) deveria lançar");
const vazio = await mk({});
has(stack(vazio).innerHTML, "Painel sem cards", "painel sem cards deveria explicar o que fazer");

/* 3. os três arranjos marcam a pilha e a grade recebe as colunas */
const vert = await mk({ cards: [{ type: "markdown" }, { type: "markdown" }] });
ok(stack(vert).className === "stack vertical", "arranjo vertical não marcou a classe");
const horiz = await mk({ layout: "horizontal", cards: [{ type: "markdown" }] });
ok(stack(horiz).className === "stack horizontal wrap", "fileira deveria quebrar linha por padrão");
const semQuebra = await mk({ layout: "horizontal", wrap: false, cards: [{ type: "markdown" }] });
ok(stack(semQuebra).className === "stack horizontal nowrap", "wrap:false deveria travar a quebra");
const grade = await mk({ layout: "grid", columns: 3, cards: [{ type: "markdown" }] });
ok(stack(grade).className === "stack grid", "grade não marcou a classe");
ok(vars(grade)["--cols"] === "3", "grade não publicou o número de colunas");
/* arranjo inválido cai na pilha em vez de quebrar */
const bobo = await mk({ layout: "diagonal", cards: [{ type: "markdown" }] });
ok(stack(bobo).className === "stack vertical", "arranjo desconhecido deveria cair na pilha");
/* colunas presas entre 1 e 8 */
ok((await mk({ layout: "grid", columns: 99, cards: [] }))._config.columns === 8, "colunas sem teto");
ok((await mk({ layout: "grid", columns: 0, cards: [] }))._config.columns === 1, "colunas sem piso");

/* 4. span por card — a gramática do custom-stack-cards */
const spans = await mk({
  layout: "grid", columns: 3,
  cards: [
    { type: "markdown", grid_options: { columns: 2, rows: 2 } },
    { type: "markdown", grid_options: { columns: 9 } },   // maior que a grade
    { type: "markdown" },
  ],
});
const s = slots(spans);
ok(s[0].style.gridColumn === "span 2" && s[0].style.gridRow === "span 2", "span de coluna/linha não foi aplicado");
ok(s[1].style.gridColumn === "span 3", "span maior que a grade deveria ser aparado pelo número de colunas");
ok(s[2].style.gridColumn === "span 1", "card sem span deveria ocupar uma célula");
const pesos = await mk({ layout: "horizontal", cards: [{ type: "markdown", grid_options: { columns: 2 } }, { type: "markdown" }] });
ok(slots(pesos)[0].style.flex === "2 1 0", "peso da fileira não virou flex");
ok(slots(pesos)[1].style.flex === "1 1 0", "card sem peso na fileira deveria valer 1");
const alturas = await mk({ cards: [{ type: "markdown" }, { type: "markdown", grid_options: { rows: 3 } }] });
ok(!slots(alturas)[0].style.flex, "na pilha, peso 1 não deveria escrever flex (evita esticão indesejado)");
ok(slots(alturas)[1].style.flex === "3 1 auto", "peso de altura na pilha não virou flex");

/* 5. divisórias: automáticas entre cards, explícitas onde o dono põe */
const auto = await mk({ separators: "between", cards: [{ type: "markdown" }, { type: "markdown" }, { type: "markdown" }] });
ok(seps(auto).length === 2, `três cards com divisória automática deveriam render 2 fios, vieram ${seps(auto).length}`);
ok(seps(auto)[0].className === "sep h engraved", "divisória da pilha deveria ser deitada e gravada");
const autoH = await mk({ layout: "horizontal", separators: "between", cards: [{ type: "markdown" }, { type: "markdown" }] });
ok(seps(autoH)[0].className === "sep v engraved", "na fileira a divisória automática deveria ser em pé");
/* divisória explícita não ganha uma automática grudada ao lado */
const mista = await mk({ separators: "between", cards: [{ type: "markdown" }, { type: "divider" }, { type: "markdown" }] });
ok(seps(mista).length === 1, `divisória explícita não deveria atrair uma automática (vieram ${seps(mista).length})`);
/* divisória com rótulo vira a linha com texto no meio */
const rot = await mk({ cards: [{ type: "divider", label: "Suíte" }] });
ok(seps(rot)[0].className.includes("lbl"), "divisória com rótulo deveria usar o desenho com texto");
has(seps(rot)[0].innerHTML, "Suíte", "o rótulo da divisória sumiu");
/* e o rótulo passa por escape: YAML do dono não injeta HTML */
const xss = await mk({ cards: [{ type: "divider", label: "<b>x</b>" }] });
has(seps(xss)[0].innerHTML, "&lt;b&gt;", "rótulo de divisória precisa de escape");

/* 6. pseudo-cards não viram card do HA */
const pseudo = await mk({ cards: [{ type: "divider" }, { type: "spacer", size: 30 }, { type: "markdown" }] });
ok(pseudo._cardEls.length === 1, `só o markdown deveria virar card; viraram ${pseudo._cardEls.length}`);
const spacer = stack(pseudo).children.find((n) => n.className === "spacer");
ok(spacer && spacer.style.height === "30px", "espaço na pilha deveria virar altura");
const spacerH = await mk({ layout: "horizontal", cards: [{ type: "spacer", size: 20 }] });
ok(stack(spacerH).children[0].style.width === "20px", "espaço na fileira deveria virar largura");

/* 7. hass e editMode descem para os filhos; ll-rebuild recria só um */
const vivo = await mk({ cards: [{ type: "markdown" }, { type: "markdown" }] });
const h2 = { states: { "light.x": {} }, callService() {} };
vivo.hass = h2;
ok(vivo._cardEls.every((el) => el.hass === h2), "hass não desceu para todos os filhos");
vivo.editMode = true;
ok(vivo._cardEls.every((el) => el.editMode === true), "editMode não desceu para os filhos");
const antigo = vivo._cardEls[0];
antigo.dispatchEvent({ type: "ll-rebuild", stopPropagation() {} });
ok(vivo._cardEls[0] !== antigo, "ll-rebuild deveria ter trocado o filho");
ok(vivo._cardEls.length === 2, "ll-rebuild não pode perder os outros filhos");

/* 8. o shadow root é montado uma vez só — reescrevê-lo mataria os filhos */
const remont = await mk({ cards: [{ type: "markdown" }] });
const shadowAntes = remont.shadowRoot;
const stackAntes = stack(remont);
remont.setConfig({ cards: [{ type: "markdown" }], paper_color: "blue-3" });
ok(remont.shadowRoot === shadowAntes && stack(remont) === stackAntes,
  "trocar a config não pode recriar o shadow root");

/* 9. papel, relevo e tinta — claro e noite */
const claro = await mk({ cards: [] });
has(vars(claro)["--mw-paper"], "#fdfaf3", "papel padrão deveria ser o creme");
has(vars(claro)["--mw-elev"], "inset 4px 4px 8px rgba(255,252,240,0.90)", "relevo 3D claro fora do padrão do MW Power Button");
has(vars(claro)["--mw-ink"], "rgba(28, 25, 20, 0.92)", "tinta clara fora da paleta canônica");
const noite = await mk({ paper_dark: true, cards: [] });
has(vars(noite)["--mw-paper"], "#2b2825", "papel de noite deveria ser o grafite");
has(vars(noite)["--mw-elev"], "rgba(255,252,240,0.10)", "relevo 3D de noite não pode usar o branco do modo claro");
has(vars(noite)["--mw-ink"], "rgba(247, 244, 236, 0.94)", "tinta de noite fora da paleta canônica");
ok(vars(await mk({ depth: "flat", cards: [] }))["--mw-elev"] === "none", "depth flat deveria zerar o relevo");
ok(!vars(await mk({ depth: "soft", cards: [] }))["--mw-elev"].includes("inset"), "depth soft não deveria ter relevo interno");
/* papel escolhido pelo dono chega ao CSS nas duas rampas */
has(vars(await mk({ paper_color: "red-4", cards: [] }))["--mw-paper"], "hsl(6,", "tom escolhido não chegou ao papel claro");
has(vars(await mk({ paper_color: "red-4", paper_dark: true, cards: [] }))["--mw-paper"], "hsl(6,", "tom escolhido não chegou ao papel de noite");

/* 10. casca: ligada por padrão, e 'bare' quando o dono só quer a folha */
ok(!(await mk({ cards: [] })).shadowRoot.querySelector(".shell")._classes.has("bare"), "casca deveria vir ligada");
ok((await mk({ shell: false, cards: [] })).shadowRoot.querySelector(".shell")._classes.has("bare"), "shell:false deveria tirar a casca");

/* 11. achatar o filho é por variável de tema — seletor não atravessa shadow */
const css = style(await mk({ cards: [] }));
has(css, "--ha-card-background:transparent", "sem --ha-card-background o card de dentro continua com fundo próprio");
has(css, "--ha-card-box-shadow:none", "sem --ha-card-box-shadow sobra sombra dentro do papel");
ok(cls(slots(await mk({ cards: [{ type: "markdown" }] }))[0]).includes("flat"), "achatar os filhos deveria ser o padrão");
ok(!cls(slots(await mk({ flat_children: false, cards: [{ type: "markdown" }] }))[0]).includes("flat"),
  "flat_children:false deveria devolver a moldura do card de dentro");
ok(cls(slots(await mk({ child_relief: "sunken", cards: [{ type: "markdown" }] }))[0]).includes("sunken"),
  "relevo afundado não foi aplicado ao card de dentro");
ok(cls(slots(await mk({ child_relief: "raised", cards: [{ type: "markdown" }] }))[0]).includes("raised"),
  "relevo saliente não foi aplicado ao card de dentro");

/* 12. só transform e opacity podem animar — o resto repinta a cada quadro */
const anim = css.match(/@keyframes[\s\S]*?\}\s*\}/g) || [];
ok(!anim.some((k) => /(box-shadow|filter|width|height|left|top)\s*:/.test(k)),
  "animação tocando propriedade que repinta (só transform/opacity são permitidos)");

/* 13. getCardSize soma os filhos e é assíncrona */
const tam = await mk({ cards: [{ type: "markdown" }, { type: "markdown" }] });
const sz = tam.getCardSize();
ok(typeof sz.then === "function", "getCardSize deveria ser assíncrona (filho lazy devolve Promise)");
ok((await sz) >= 3, "getCardSize não somou os filhos");

/* 14. o editor: default intacto não polui o YAML, e o span sobrevive */
const ed = new Editor();
let saida = null;
ed.addEventListener("config-changed", (ev) => { saida = ev.detail.config; });
ed.setConfig({ cards: [{ type: "markdown" }] });
ed._patch({ gap: 12 });   // 12 é o padrão
ok(saida && !("gap" in saida), "default igual ao padrão não deveria ser escrito no YAML");
ed._patch({ gap: 24 });
ok(saida && saida.gap === 24, "valor diferente do padrão precisa ir para o YAML");
ed._setSpan(0, "columns", 3);
ok(saida.cards[0].grid_options.columns === 3, "o editor não gravou o span");
ed._setSpan(0, "columns", 1);
ok(!saida.cards[0].grid_options, "span de volta a 1 deveria sumir do YAML");
ed._setSpan(0, "rows", 2);
ed._writeCard(0, { type: "button" });
ok(saida.cards[0].grid_options && saida.cards[0].grid_options.rows === 2,
  "trocar o card pelo editor do HA não pode apagar o span que o dono escolheu");

/* 15. o editor mexe na lista sem perder itens */
ed.setConfig({ cards: [{ type: "markdown", title: "A" }, { type: "markdown", title: "B" }] });
ed._render();
ed._cardAction("adddiv", 0);
ok(saida.cards.length === 3 && saida.cards[2].type === "divider", "botão de divisória não acrescentou a linha");
ed._cardAction("dup", 0);
ok(saida.cards.length === 4 && saida.cards[1].title === "A", "duplicar não repetiu o item no lugar certo");
ed._cardAction("down", 0);
ok(saida.cards[1].title === "A", "mover para baixo não trocou os vizinhos");
ed._cardAction("del", 0);
ok(saida.cards.length === 3, "apagar não removeu o item");

/* ------------------------------- resultado ------------------------------ */

if (fails.length) {
  console.error(`\n✗ probe: ${pass} ok, ${fails.length} falha(s)\n`);
  fails.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`✓ probe: ${pass} verificações passaram`);
})();
