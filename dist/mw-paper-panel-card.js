/* MW Paper Panel Card — custom:mw-paper-panel-card
 *
 * Um painel de papel encardido com relevo 3D que HOSPEDA outros cards do Home
 * Assistant: botões, picture-elements, gráficos, qualquer coisa. Os cards de
 * dentro se arranjam em pilha vertical, fileira horizontal ou grade, com span
 * por card (grid_options.columns / .rows, a mesma gramática do
 * custom-stack-cards) e linhas divisórias de papel entre as peças.
 *
 * Arquivo único, sem build: este arquivo é fonte E artefato (HACS).
 *
 * Contratos de card hospedeiro (valem aqui, custam caro quando esquecidos):
 *   - o shadow root é montado UMA vez; reescrever innerHTML mata os filhos;
 *   - hass desce para cada filho a cada set;
 *   - ll-rebuild do filho é escutado e recria só aquele filho;
 *   - getCardSize pode devolver Promise, então a nossa é async;
 *   - a chave "visibility:" de um card NÃO funciona aqui dentro (quem a aplica
 *     é o hui-card do HA, que não está neste caminho) — use type: conditional.
 */
(() => {
  "use strict";

  const LAYOUTS = ["vertical", "horizontal", "grid"];
  const DEPTHS = ["flat", "soft", "3d"];

  const DEFAULTS = {
    layout: "vertical",
    columns: 2,
    gap: 12,
    wrap: true,
    align: "stretch",
    justify: "start",
    separators: "none",
    separator_style: "engraved",
    separator_thickness: 1,
    separator_inset: 0,
    separator_color: "",
    shell: true,
    shell_color: "#a5123f",
    shell_radius: 26,
    panel_radius: 22,
    padding: 14,
    content_padding: 18,
    panel_min_height: 0,
    paper_color: "paper",
    paper_dark: false,
    depth: "3d",
    child_relief: "none",
    child_radius: 14,
    child_padding: 0,
    flat_children: true,
    header: "",
    header_icon: "",
    header_color: "",
    header_text_color: "rgba(255,255,255,0.92)",
    content_text_color: "",
  };

  const LABELS = {
    layout: "Arranjo dos cards",
    columns: "Colunas da grade",
    gap: "Espaço entre cards",
    wrap: "Quebrar linha (fileira)",
    align: "Alinhamento no eixo curto",
    justify: "Alinhamento no eixo longo",
    separators: "Linhas divisórias automáticas",
    separator_style: "Desenho da divisória",
    separator_thickness: "Espessura da divisória",
    separator_inset: "Recuo da divisória",
    separator_color: "Cor da divisória",
    shell: "Casca colorida ao redor",
    shell_color: "Cor da casca",
    shell_radius: "Raio da casca",
    panel_radius: "Raio do papel",
    padding: "Respiro da casca",
    content_padding: "Respiro do papel",
    panel_min_height: "Altura mínima do papel",
    paper_color: "Cor do papel",
    paper_dark: "Papel de noite",
    depth: "Relevo",
    child_relief: "Relevo dos cards de dentro",
    child_radius: "Raio dos cards de dentro",
    child_padding: "Respiro dos cards de dentro",
    flat_children: "Achatar os cards de dentro",
    header: "Título",
    header_icon: "Ícone do título",
    header_color: "Cor da faixa do título",
    header_text_color: "Cor do texto do título",
    content_text_color: "Cor do texto sobre o papel",
  };

  const COLOR_FIELDS = ["shell_color", "header_color", "header_text_color",
    "content_text_color", "separator_color"];

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

  // >>> paper-palette v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/paper-palette/paper-palette.js
  // 49 papéis encardidos: 7 matizes do arco-íris × 7 tons (1 = quase branco,
  // 7 = mais encardido). Saturação baixa de propósito — papel descansa a vista.
  const PAPER_HUES = [
    ["red", "Vermelho", 6], ["orange", "Laranja", 27], ["yellow", "Amarelo", 47],
    ["green", "Verde", 96], ["blue", "Azul", 203], ["indigo", "Anil", 236],
    ["violet", "Violeta", 283],
  ];
  const PAPER_TONES = [[97, 6], [96, 9], [94, 12], [92, 15], [90, 18], [88, 21], [85, 24]];
  const PAPER_DEFAULT = "linear-gradient(145deg, #fdfaf3, #e8e3d8)";
  const paperGradient = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    if (!m) return PAPER_DEFAULT;
    const hue = PAPER_HUES.find((h) => h[0] === m[1]);
    if (!hue) return PAPER_DEFAULT;
    const [l, s] = PAPER_TONES[+m[2] - 1];
    return `linear-gradient(145deg, hsl(${hue[2]}, ${s}%, ${l}%), hsl(${hue[2]}, ${s + 4}%, ${l - 7}%))`;
  };
  const paperOptions = () => [{ value: "paper", label: "Papel original (creme)" }].concat(
    ...PAPER_HUES.map((h) => PAPER_TONES.map((t, i) => ({
      value: `${h[0]}-${i + 1}`,
      label: `${h[1]} · tom ${i + 1}${i === 0 ? " (mais claro)" : i === 6 ? " (mais encardido)" : ""}`,
    }))));
  // <<< paper-palette v1

  // >>> paper-dark-palette v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/paper-dark-palette/paper-dark-palette.js
  // 49 papéis de noite: as mesmas 7 matizes do paper-palette v1 × 7 tons
  // (1 = papel escuro mais claro, 7 = mais encardido). A saturação sobe mais
  // rápido que na rampa clara porque matiz em luminosidade baixa desaparece.
  const PAPER_DARK_HUES = [
    ["red", "Vermelho", 6], ["orange", "Laranja", 27], ["yellow", "Amarelo", 47],
    ["green", "Verde", 96], ["blue", "Azul", 203], ["indigo", "Anil", 236],
    ["violet", "Violeta", 283],
  ];
  const PAPER_DARK_TONES = [[26, 10], [24, 13], [21, 16], [19, 19], [16, 22], [14, 25], [11, 28]];
  const PAPER_DARK_DEFAULT = "linear-gradient(145deg, #2b2825, #161411)";
  const paperDarkGradient = (key) => {
    const m = /^([a-z]+)-([1-7])$/.exec(String(key || "").trim());
    if (!m) return PAPER_DARK_DEFAULT;
    const hue = PAPER_DARK_HUES.find((h) => h[0] === m[1]);
    if (!hue) return PAPER_DARK_DEFAULT;
    const [l, s] = PAPER_DARK_TONES[+m[2] - 1];
    return `linear-gradient(145deg, hsl(${hue[2]}, ${s}%, ${l}%), hsl(${hue[2]}, ${s + 6}%, ${Math.max(4, l - 6)}%))`;
  };
  const paperDarkOptions = () => [{ value: "paper", label: "Papel de noite (grafite)" }].concat(
    ...PAPER_DARK_HUES.map((h) => PAPER_DARK_TONES.map((t, i) => ({
      value: `${h[0]}-${i + 1}`,
      label: `${h[1]} · tom ${i + 1}${i === 0 ? " (mais claro)" : i === 6 ? " (mais escuro)" : ""}`,
    }))));
  // Tinta que se lê sobre o papel do modo pedido. Não é contraste calculado:
  // é o par fixo que a casa usa, para dois cards lado a lado combinarem.
  const paperInk = (dark) => (dark
    ? { text: "rgba(247, 244, 236, 0.94)", dim: "rgba(247, 244, 236, 0.62)", line: "rgba(255, 255, 255, 0.14)" }
    : { text: "rgba(28, 25, 20, 0.92)", dim: "rgba(28, 25, 20, 0.58)", line: "rgba(0, 0, 0, 0.14)" });
  // <<< paper-dark-palette v1

  const paperOf = (c) => (c.paper_dark === true
    ? paperDarkGradient(c.paper_color) : paperGradient(c.paper_color));

  // O relevo. flat = nada · soft = a sombra de sempre · 3d = o papel do
  // MW Power Button ligado: luz presa na quina de cima e sombra na de baixo,
  // com a folha projetando no dashboard.
  const cardRelief = (depth, dark) => {
    if (depth === "flat") return "none";
    if (depth !== "3d") return "0 2px 3px rgba(0,0,0,0.18), 0 6px 12px rgba(0,0,0,0.14)";
    return `inset 4px 4px 8px rgba(255,252,240,${dark ? "0.10" : "0.90"}),`
      + ` inset -4px -4px 8px rgba(0,0,0,${dark ? "0.50" : "0.12"}),`
      + ` 0 2px 6px rgba(0,0,0,${dark ? "0.55" : "0.18"}),`
      + ` 0 6px 16px rgba(0,0,0,${dark ? "0.42" : "0.14"}),`
      + ` 0 12px 28px rgba(0,0,0,${dark ? "0.30" : "0.08"})`;
  };

  // O oposto da folha: a peça AFUNDA no papel. Sem isso o card de dentro fica
  // boiando sobre uma folha em relevo — duas coisas salientes, e o olho não
  // sabe qual está por cima de qual.
  const sunkenRelief = (depth, dark) => {
    if (depth === "flat") return "none";
    if (depth !== "3d") return "inset 1px 1px 0 rgba(255,255,255,0.24), inset -1px -1px 0 rgba(0,0,0,0.12)";
    return `inset 2px 2px 5px rgba(0,0,0,${dark ? "0.55" : "0.30"}),`
      + ` inset -1px -1px 3px rgba(255,255,255,${dark ? "0.05" : "0.45"}),`
      + ` 0 1px 0 rgba(255,255,255,${dark ? "0.06" : "0.55"})`;
  };

  const raisedRelief = (depth, dark) => {
    if (depth === "flat") return "none";
    if (depth !== "3d") return "0 1px 2px rgba(0,0,0,0.16)";
    return `inset 1px 1px 2px rgba(255,250,235,${dark ? "0.07" : "0.85"}),`
      + ` inset -1px -1px 2px rgba(0,0,0,${dark ? "0.50" : "0.08"}),`
      + ` 0 3px 6px rgba(0,0,0,${dark ? "0.45" : "0.22"})`;
  };

  // ---- cor: parse / compose (mantém alfa, que o desenho usa muito) ----
  const parseColor = (str) => {
    const s = String(str || "").trim();
    let m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    m = s.match(/^#([0-9a-f]{6})$/i);
    if (m) { const n = parseInt(m[1], 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 }; }
    m = s.match(/^#([0-9a-f]{3})$/i);
    if (m) { const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16)); return { r, g, b, a: 1 }; }
    return { r: 128, g: 128, b: 128, a: 1 };
  };
  const toHex = ({ r, g, b }) =>
    "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  const toRgba = ({ r, g, b, a }) => `rgba(${r}, ${g}, ${b}, ${a})`;
  const mixWhite = (str, k) => {
    const { r, g, b, a } = parseColor(str);
    const f = (v) => Math.round(v + (255 - v) * k);
    return toRgba({ r: f(r), g: f(g), b: f(b), a });
  };

  // Pseudo-cards: resolvidos aqui dentro, nunca entregues ao loadCardHelpers.
  // Divisória é papel, não é card — pedir um card para o HA só para desenhar
  // um fio custaria um elemento inteiro por linha.
  const PSEUDO = ["divider", "spacer"];
  const isPseudo = (cfg) => !!cfg && typeof cfg === "object" && PSEUDO.includes(cfg.type);

  const itemTitle = (cfg) => {
    if (!cfg || typeof cfg !== "object") return "item inválido";
    if (cfg.type === "divider") return cfg.label ? `divisória · ${cfg.label}` : "divisória";
    if (cfg.type === "spacer") return `espaço · ${num(cfg.size, 12)}px`;
    const t = String(cfg.type || "?").replace(/^custom:/, "");
    const extra = cfg.title || cfg.name || cfg.entity
      || (Array.isArray(cfg.entities) ? `${cfg.entities.length} entidades` : "");
    return extra ? `${t} · ${extra}` : t;
  };

  /* =========================== o card =========================== */

  class MwPaperPanelCard extends HTMLElement {
    setConfig(config) {
      if (!config || typeof config !== "object") throw new Error("mw-paper-panel-card: configuração inválida");
      const cfg = { ...DEFAULTS, ...config };
      cfg.cards = Array.isArray(config.cards) ? config.cards.slice() : [];
      if (!LAYOUTS.includes(cfg.layout)) cfg.layout = "vertical";
      if (!DEPTHS.includes(cfg.depth)) cfg.depth = "3d";
      cfg.columns = Math.min(8, Math.max(1, num(cfg.columns, 2)));
      this._config = cfg;

      // trocar a config pode ter trocado os filhos; comparar por JSON é barato
      // perto de recriar cards à toa a cada repintura do editor (e o editor
      // repinta a cada tecla).
      const sig = JSON.stringify([cfg.cards, cfg.layout, cfg.columns, cfg.separators]);
      if (sig !== this._sig) { this._sig = sig; this._built = false; }
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      if (!this._config) return;
      if (!this._built) { this._render(); return; }
      for (const el of this._cardEls || []) el.hass = hass;
    }
    get hass() { return this._hass; }

    set editMode(v) {
      this._editMode = v;
      for (const el of this._cardEls || []) el.editMode = v;
    }
    get editMode() { return this._editMode; }

    static getConfigElement() { return document.createElement("mw-paper-panel-card-editor"); }

    static getStubConfig() {
      return {
        header: "ROTA",
        layout: "vertical",
        separators: "between",
        cards: [
          { type: "markdown", content: "**7 Hetman St** → **96 Brey Ln**" },
          { type: "markdown", content: "Tempo · 4 min" },
          { type: "markdown", content: "Distância · 0.8 mi" },
        ],
      };
    }

    // soma do que o painel mostra + a casca; getCardSize dos filhos pode
    // devolver Promise (card lazy), então esta é assíncrona de propósito
    async getCardSize() {
      let total = 0;
      for (const el of this._cardEls || []) {
        try { total += (await (el.getCardSize ? el.getCardSize() : 1)) || 1; } catch (_) { total += 1; }
      }
      const c = this._config || DEFAULTS;
      if (c.layout === "horizontal") total = Math.ceil(total / Math.max(1, (this._cardEls || []).length)) * 2;
      if (c.layout === "grid") total = Math.ceil(total / c.columns);
      return Math.max(2, Math.round(total) + (c.shell === false ? 0 : 1));
    }

    getLayoutOptions() { return { grid_columns: "full", grid_rows: "auto" }; }

    /* ------------------------------ DOM ------------------------------ */

    _ensureDom() {
      if (this.shadowRoot && this._els) return;
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = [
        '<style id="mw-style"></style>',
        '<ha-card class="shell">',
        '  <div class="hdr" hidden><ha-icon class="hic"></ha-icon><span class="htx"></span></div>',
        '  <div class="panel"><div class="stack"></div></div>',
        "</ha-card>",
      ].join("\n");
      const q = (s) => this.shadowRoot.querySelector(s);
      this._els = {
        style: q("#mw-style"), shell: q(".shell"), hdr: q(".hdr"),
        hic: q(".hic"), htx: q(".htx"), panel: q(".panel"), stack: q(".stack"),
      };
    }

    _css() {
      return `
        :host{display:block;}
        ha-card.shell{position:relative;box-sizing:border-box;height:100%;overflow:visible;
          background:var(--mw-shell);border:none;border-radius:var(--sr);padding:var(--pad);
          display:flex;flex-direction:column;gap:var(--hgap);
          box-shadow:0 6px 18px rgba(0,0,0,0.26), 0 18px 40px rgba(0,0,0,0.16);}
        ha-card.shell.bare{background:transparent;padding:0;box-shadow:none;}
        .hdr{display:flex;align-items:center;gap:8px;min-height:24px;padding:2px 8px 0;
          color:var(--mw-hdr-text);font-weight:700;font-size:13px;letter-spacing:.08em;
          text-transform:uppercase;line-height:1.2;}
        .hdr.chip{background:var(--mw-hdr-bg);border-radius:999px;padding:6px 14px;align-self:flex-start;}
        .hdr ha-icon{--mdc-icon-size:18px;width:18px;height:18px;flex:0 0 auto;}
        .hdr ha-icon[hidden]{display:none;}
        .hdr[hidden]{display:none;}
        .panel{flex:1 1 auto;min-width:0;box-sizing:border-box;position:relative;
          background:var(--mw-paper);box-shadow:var(--mw-elev);border-radius:var(--pr);
          padding:var(--cpad);min-height:var(--pmin);
          color:var(--mw-ink);
          --primary-text-color:var(--mw-ink);
          --secondary-text-color:var(--mw-ink-dim);
          --ha-card-header-color:var(--mw-ink);
          --markdown-code-background-color:rgba(0,0,0,.06);
          --code-editor-background-color:rgba(0,0,0,.06);}
        .stack{display:flex;flex-direction:column;gap:var(--gap);min-width:0;}
        .stack.horizontal{flex-direction:row;align-items:var(--align);justify-content:var(--justify);}
        .stack.horizontal.nowrap{flex-wrap:nowrap;}
        .stack.horizontal.wrap{flex-wrap:wrap;}
        .stack.vertical{align-items:var(--align);justify-content:var(--justify);}
        .stack.grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));
          align-items:var(--align);}
        .slot{min-width:0;box-sizing:border-box;border-radius:var(--chr);padding:var(--chp);}
        .slot.sunken{box-shadow:var(--mw-sunken);background:rgba(0,0,0,.025);}
        .slot.raised{box-shadow:var(--mw-raised);background:rgba(255,255,255,.16);}
        .slot.flat{--ha-card-background:transparent;--ha-card-box-shadow:none;
          --ha-card-border-width:0;--ha-card-border-color:transparent;
          --ha-card-border-radius:var(--chr);}
        .slot > *{display:block;}
        .sep{min-width:0;}
        .stack.grid > .sep{grid-column:1 / -1;}
        .sep.h{height:0;margin:0 var(--sin);border-top:var(--sth) solid var(--mw-sep);}
        .sep.h.engraved{box-shadow:0 var(--sth) 0 var(--mw-sep-hi);}
        .sep.h.dashed{border-top-style:dashed;box-shadow:none;}
        .sep.v{width:0;align-self:stretch;margin:var(--sin) 0;border-left:var(--sth) solid var(--mw-sep);}
        .sep.v.engraved{box-shadow:var(--sth) 0 0 var(--mw-sep-hi);}
        .sep.v.dashed{border-left-style:dashed;box-shadow:none;}
        .sep.lbl{display:flex;align-items:center;gap:10px;height:auto;border:0;box-shadow:none;
          margin:2px var(--sin);color:var(--mw-ink-dim);font-size:11px;font-weight:700;
          letter-spacing:.1em;text-transform:uppercase;line-height:1.2;}
        .sep.lbl .ln{flex:1 1 auto;height:0;border-top:var(--sth) solid var(--mw-sep);
          box-shadow:0 var(--sth) 0 var(--mw-sep-hi);}
        .spacer{flex:0 0 auto;}
        .empty{padding:18px;text-align:center;font-size:13px;color:var(--mw-ink-dim);
          border:1px dashed var(--mw-sep);border-radius:12px;}
        .err{padding:12px;border-radius:10px;background:rgba(200,0,0,.12);font-size:13px;}
      `;
    }

    _paintVars() {
      const c = this._config;
      const dark = c.paper_dark === true;
      const ink = paperInk(dark);
      const s = this._els.shell.style;
      const set = (k, v) => s.setProperty(k, v);
      set("--mw-shell", c.shell_color);
      set("--mw-paper", paperOf(c));
      set("--mw-elev", cardRelief(c.depth, dark));
      set("--mw-sunken", sunkenRelief(c.depth, dark));
      set("--mw-raised", raisedRelief(c.depth, dark));
      set("--mw-ink", c.content_text_color || ink.text);
      set("--mw-ink-dim", c.content_text_color || ink.dim);
      set("--mw-sep", c.separator_color || ink.line);
      set("--mw-sep-hi", dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)");
      set("--mw-hdr-bg", c.header_color || mixWhite(c.shell_color, 0.18));
      set("--mw-hdr-text", c.header_text_color);
      set("--sr", `${num(c.shell_radius, 26)}px`);
      set("--pr", `${num(c.panel_radius, 22)}px`);
      set("--pad", `${num(c.padding, 14)}px`);
      set("--cpad", `${num(c.content_padding, 18)}px`);
      set("--pmin", `${num(c.panel_min_height, 0)}px`);
      set("--gap", `${num(c.gap, 12)}px`);
      set("--hgap", c.header ? "10px" : "0px");
      set("--cols", String(c.columns));
      set("--chr", `${num(c.child_radius, 14)}px`);
      set("--chp", `${num(c.child_padding, 0)}px`);
      set("--sth", `${Math.max(1, num(c.separator_thickness, 1))}px`);
      set("--sin", `${num(c.separator_inset, 0)}px`);
      set("--align", c.align === "stretch" ? "stretch" : c.align);
      set("--justify", { start: "flex-start", center: "center", end: "flex-end",
        between: "space-between", around: "space-around" }[c.justify] || "flex-start");
      this._els.shell.classList.toggle("bare", c.shell === false);
    }

    _paintHeader() {
      const c = this._config;
      const on = !!(c.header || c.header_icon);
      this._els.hdr.hidden = !on;
      if (!on) return;
      this._els.hdr.classList.toggle("chip", c.shell !== false);
      this._els.htx.textContent = c.header || "";
      // propriedade E atributo: o ha-icon do HA aceita os dois, e o dublê da
      // bancada só enxerga o atributo — sem ele a foto sai sem ícone
      if (c.header_icon) {
        this._els.hic.icon = c.header_icon;
        this._els.hic.setAttribute("icon", c.header_icon);
        this._els.hic.hidden = false;
      }
      else this._els.hic.hidden = true;
    }

    /* --------------------------- os filhos --------------------------- */

    async _helpers() {
      if (!this._helpersP) {
        this._helpersP = (window.loadCardHelpers ? window.loadCardHelpers() : Promise.resolve(null));
      }
      return this._helpersP;
    }

    _createCard(helpers, cfg) {
      let el;
      try {
        el = helpers ? helpers.createCardElement(cfg) : document.createElement("hui-error-card");
      } catch (e) {
        el = document.createElement("div");
        el.className = "err";
        el.textContent = `mw-paper-panel-card: card inválido (${e && e.message ? e.message : e})`;
        return el;
      }
      if (this._hass) el.hass = this._hass;
      if (this._editMode !== undefined) el.editMode = this._editMode;
      // ll-rebuild: o card de dentro pede para ser recriado (é o contrato que
      // as pilhas do HA respeitam). Sem isto, um card que troca de tipo em
      // tempo de execução fica congelado no que era antes.
      el.addEventListener("ll-rebuild", (ev) => {
        ev.stopPropagation();
        const novo = this._createCard(helpers, cfg);
        const i = (this._cardEls || []).indexOf(el);
        if (i >= 0) this._cardEls[i] = novo;
        if (el.parentNode) el.parentNode.replaceChild(novo, el);
      });
      return el;
    }

    _makeSeparator(item, vertical) {
      const d = document.createElement("div");
      const style = ["engraved", "line", "dashed"].includes(item && item.style)
        ? item.style : this._config.separator_style;
      if (item && item.label) {
        d.className = `sep lbl ${style}`;
        d.innerHTML = `<span class="ln"></span><span class="tx">${esc(item.label)}</span><span class="ln"></span>`;
      } else {
        d.className = `sep ${vertical ? "v" : "h"} ${style}`;
      }
      if (item && item.color) d.style.setProperty("--mw-sep", item.color);
      if (item && item.thickness) d.style.setProperty("--sth", `${num(item.thickness, 1)}px`);
      if (item && item.inset !== undefined) d.style.setProperty("--sin", `${num(item.inset, 0)}px`);
      return d;
    }

    _makeSpacer(item, vertical) {
      const d = document.createElement("div");
      d.className = "spacer";
      const px = `${num(item.size, 12)}px`;
      if (vertical) d.style.width = px; else d.style.height = px;
      return d;
    }

    _applySpan(slot, item) {
      const c = this._config;
      const go = (item && item.grid_options) || {};
      const cols = Math.max(1, num(go.columns, 1));
      const rows = Math.max(1, num(go.rows, 1));
      if (c.layout === "grid") {
        slot.style.gridColumn = `span ${Math.min(cols, c.columns)}`;
        slot.style.gridRow = `span ${rows}`;
      } else if (c.layout === "horizontal") {
        slot.style.flex = `${cols} 1 0`;
      } else if (rows !== 1) {
        slot.style.flex = `${rows} 1 auto`;
      }
    }

    async _mountItems() {
      const c = this._config;
      const stack = this._els.stack;
      const token = (this._token = (this._token || 0) + 1);
      const items = c.cards || [];
      const vertical = c.layout === "horizontal"; // separador deitado na fileira

      stack.className = `stack ${c.layout}${c.layout === "horizontal" ? (c.wrap === false ? " nowrap" : " wrap") : ""}`;

      if (!items.length) {
        stack.innerHTML = `<div class="empty">Painel sem cards — adicione no editor visual.</div>`;
        this._cardEls = [];
        this._built = true;
        return;
      }

      const needHelpers = items.some((i) => !isPseudo(i));
      const helpers = needHelpers ? await this._helpers() : null;
      if (token !== this._token) return;

      const frag = document.createDocumentFragment();
      const cardEls = [];
      const auto = c.separators === "between";
      items.forEach((item, i) => {
        if (auto && i > 0 && !isPseudo(item) && !isPseudo(items[i - 1])) {
          frag.appendChild(this._makeSeparator(null, vertical));
        }
        if (item && item.type === "divider") { frag.appendChild(this._makeSeparator(item, vertical)); return; }
        if (item && item.type === "spacer") { frag.appendChild(this._makeSpacer(item, vertical)); return; }
        const slot = document.createElement("div");
        slot.className = `slot ${c.child_relief === "sunken" ? "sunken" : c.child_relief === "raised" ? "raised" : ""} ${c.flat_children === false ? "" : "flat"}`;
        this._applySpan(slot, item);
        const el = this._createCard(helpers, item);
        cardEls.push(el);
        slot.appendChild(el);
        frag.appendChild(slot);
      });

      stack.innerHTML = "";
      stack.appendChild(frag);
      this._cardEls = cardEls;
      this._built = true;
    }

    _render() {
      this._ensureDom();
      if (!this._styled) { this._els.style.textContent = this._css(); this._styled = true; }
      this._paintVars();
      this._paintHeader();
      if (!this._built) this._mountItems();
    }
  }

  /* ========================== o editor ========================== */

  // Os editores internos do HA (hui-card-picker / hui-card-element-editor) não
  // vêm carregados: só entram quando alguma tela de edição os pede. Instanciar
  // o editor da pilha vertical puxa os dois de uma vez. Se não vier (versão
  // antiga do HA), o editor cai no textarea JSON — feio, mas nunca sem saída.
  const loadHuiEditors = async () => {
    if (customElements.get("hui-card-element-editor")) return true;
    try {
      const helpers = await window.loadCardHelpers();
      const stack = helpers.createCardElement({ type: "vertical-stack", cards: [] });
      await stack.constructor.getConfigElement();
      await Promise.race([
        customElements.whenDefined("hui-card-element-editor"),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    } catch (_) { /* segue no plano B */ }
    return !!customElements.get("hui-card-element-editor");
  };

  const LAYOUT_OPTIONS = [
    { value: "vertical", label: "Pilha vertical" },
    { value: "horizontal", label: "Fileira horizontal" },
    { value: "grid", label: "Grade" },
  ];
  const DEPTH_OPTIONS = [
    { value: "3d", label: "3D (papel em relevo)" },
    { value: "soft", label: "Suave (só sombra)" },
    { value: "flat", label: "Chapado" },
  ];
  const RELIEF_OPTIONS = [
    { value: "none", label: "Nenhum (o card encosta no papel)" },
    { value: "sunken", label: "Afundado no papel" },
    { value: "raised", label: "Saliente sobre o papel" },
  ];
  const SEP_OPTIONS = [
    { value: "none", label: "Nenhuma (só as que eu colocar)" },
    { value: "between", label: "Entre todos os cards" },
  ];
  const SEPSTYLE_OPTIONS = [
    { value: "engraved", label: "Gravada no papel (fio + luz)" },
    { value: "line", label: "Fio simples" },
    { value: "dashed", label: "Tracejada" },
  ];
  const ALIGN_OPTIONS = [
    { value: "stretch", label: "Esticar" }, { value: "start", label: "No começo" },
    { value: "center", label: "No centro" }, { value: "end", label: "No fim" },
  ];
  const JUSTIFY_OPTIONS = [
    { value: "start", label: "No começo" }, { value: "center", label: "No centro" },
    { value: "end", label: "No fim" }, { value: "between", label: "Espaço entre" },
    { value: "around", label: "Espaço ao redor" },
  ];

  class MwPaperPanelCardEditor extends HTMLElement {
    setConfig(config) {
      this._config = { ...config, cards: (config.cards || []).slice() };
      this._render();
    }
    set hass(hass) {
      this._hass = hass;
      if (this._form) this._form.hass = hass;
      if (this._layoutForm) this._layoutForm.hass = hass;
      if (this._itemForm) this._itemForm.hass = hass;
      if (this._cardEditor) this._cardEditor.hass = hass;
      if (this._picker) this._picker.hass = hass;
    }

    // o hui-card-element-editor e o hui-card-picker esperam um objeto lovelace
    // (é assim que o editor da pilha do HA os alimenta). O editor de um card
    // custom não recebe esse objeto, então damos um de bolso.
    get _lovelace() {
      return this._fakeLovelace || (this._fakeLovelace = {
        config: { views: [] }, editMode: true, rawConfig: "",
        saveConfig: async () => {}, setEditMode: () => {},
      });
    }

    _emit(config) {
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed",
        { bubbles: true, composed: true, detail: { config } }));
    }

    _patch(patch) {
      const next = { ...this._config, ...patch };
      // default intacto não polui o YAML
      for (const [k, v] of Object.entries(next)) {
        if (k !== "cards" && k in DEFAULTS && v === DEFAULTS[k]) delete next[k];
      }
      this._emit(next);
    }

    _setCards(cards) { this._emit({ ...this._config, cards }); }
    _cardsArr() { return (this._config.cards || []).map((c) => (c && typeof c === "object" ? { ...c } : c)); }
    _layout() { return LAYOUTS.includes(this._config.layout) ? this._config.layout : DEFAULTS.layout; }

    /* ------------------------------ layout ------------------------------ */

    _render() {
      if (!this._root) {
        this._root = document.createElement("div");
        this._root.innerHTML = `
          <style>
            .mpp-sec{margin-top:16px;border:1px solid var(--divider-color);border-radius:10px;padding:10px 12px;}
            .mpp-sec>summary{cursor:pointer;font-weight:600;}
            .mpp-h{font-size:13px;font-weight:600;margin:14px 0 6px;opacity:.85;}
            .mpp-hint{font-size:12px;opacity:.65;margin:-2px 0 6px;}
            .mpp-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;
              border:1px solid var(--divider-color);background:transparent;color:var(--primary-text-color);
              font:inherit;font-size:12px;cursor:pointer;}
            .mpp-chip.add{border-style:dashed;margin-right:6px;}
            .mpp-row{display:flex;align-items:center;gap:6px;padding:6px 0;border-top:1px solid var(--divider-color);}
            .mpp-row:first-of-type{border-top:0;}
            .mpp-row .nm{flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
            .mpp-row.on .nm{font-weight:700;}
            .mpp-span{display:inline-flex;align-items:center;gap:3px;font-size:11px;opacity:.75;}
            .mpp-span input{width:38px;box-sizing:border-box;font:inherit;font-size:12px;padding:2px 4px;
              border:1px solid var(--divider-color);border-radius:6px;background:transparent;
              color:var(--primary-text-color);}
            .mpp-ib{border:0;background:transparent;cursor:pointer;color:var(--secondary-text-color);
              font:inherit;font-size:15px;line-height:1;padding:4px 6px;border-radius:6px;}
            .mpp-ib:hover{background:var(--divider-color);color:var(--primary-text-color);}
            .mpp-ib[disabled]{opacity:.3;cursor:default;}
            .mpp-ib.del:hover{color:var(--error-color, #db4437);}
            .mpp-edit{margin-top:10px;border:1px solid var(--divider-color);border-radius:10px;padding:10px;}
            .mpp-edit .top{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;font-weight:600;}
            .mpp-ta{width:100%;box-sizing:border-box;min-height:200px;font-family:monospace;font-size:12px;
              background:var(--code-editor-background-color, rgba(0,0,0,.06));color:var(--primary-text-color);
              border:1px solid var(--divider-color);border-radius:8px;padding:8px;}
            .mpp-warn{font-size:12px;color:var(--error-color, #db4437);min-height:16px;}
            .mpp-crow{display:grid;grid-template-columns:1fr 44px 110px minmax(110px,1fr);gap:10px;align-items:center;padding:6px 0;}
            .mpp-crow .lbl{font-size:13px;}
            .mpp-crow input[type=color]{width:40px;height:28px;border:none;background:none;cursor:pointer;padding:0;}
            .mpp-crow code{font-size:11px;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          </style>
          <div class="mpp-h">Arranjo</div>
          <div id="layoutform"></div>
          <div class="mpp-h">Cards do painel</div>
          <div class="mpp-hint" id="spanhint"></div>
          <div id="cards"></div>
          <div id="cardedit"></div>
          <div class="mpp-h">Aparência</div>
          <div id="mainform"></div>
          <details class="mpp-sec" id="colors"></details>`;
        this.appendChild(this._root);
        this._cardsEl = this._root.querySelector("#cards");
        this._cardEditEl = this._root.querySelector("#cardedit");
        this._colorsEl = this._root.querySelector("#colors");
        this._hintEl = this._root.querySelector("#spanhint");

        this._layoutForm = document.createElement("ha-form");
        this._layoutForm.computeLabel = (f) => LABELS[f.name] || f.name;
        this._layoutForm.addEventListener("value-changed", (ev) => this._onLayoutForm(ev));
        this._root.querySelector("#layoutform").appendChild(this._layoutForm);

        this._form = document.createElement("ha-form");
        this._form.computeLabel = (f) => LABELS[f.name] || f.name;
        this._form.addEventListener("value-changed", (ev) => this._onMainForm(ev));
        this._root.querySelector("#mainform").appendChild(this._form);
      }
      this._renderLayoutForm();
      this._renderCardList();
      this._renderMainForm();
      this._renderColors();
    }

    _renderLayoutForm() {
      const c = { ...DEFAULTS, ...this._config };
      const lay = this._layout();
      this._layoutForm.hass = this._hass;
      this._layoutForm.schema = [
        {
          name: "", type: "grid", schema: [
            { name: "layout", selector: { select: { mode: "dropdown", options: LAYOUT_OPTIONS } } },
            ...(lay === "grid" ? [{ name: "columns", selector: { number: { min: 1, max: 8, step: 1, mode: "box" } } }] : []),
            { name: "gap", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "align", selector: { select: { mode: "dropdown", options: ALIGN_OPTIONS } } },
            ...(lay === "grid" ? [] : [{ name: "justify", selector: { select: { mode: "dropdown", options: JUSTIFY_OPTIONS } } }]),
          ],
        },
        ...(lay === "horizontal" ? [{ name: "wrap", selector: { boolean: {} } }] : []),
        {
          name: "", type: "grid", schema: [
            { name: "separators", selector: { select: { mode: "dropdown", options: SEP_OPTIONS } } },
            { name: "separator_style", selector: { select: { mode: "dropdown", options: SEPSTYLE_OPTIONS } } },
            { name: "separator_thickness", selector: { number: { min: 1, max: 6, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "separator_inset", selector: { number: { min: 0, max: 80, step: 1, mode: "box", unit_of_measurement: "px" } } },
          ],
        },
      ];
      const data = { ...c };
      delete data.cards;
      this._layoutForm.data = data;
    }

    _onLayoutForm(ev) {
      ev.stopPropagation();
      const v = { ...ev.detail.value };
      delete v.cards;
      const patch = {};
      for (const [k, val] of Object.entries(v)) {
        if (val === undefined || val === null) continue;
        patch[k] = val;
      }
      this._patch(patch);
      this._renderLayoutForm();   // campos condicionais (colunas, quebra)
      this._renderCardList();     // os campos de span mudam com o arranjo
    }

    /* --------------------------- itens do painel --------------------------- */

    _spanFields(item) {
      const lay = this._layout();
      const go = (item && item.grid_options) || {};
      const c = num(go.columns, 1);
      const r = num(go.rows, 1);
      if (isPseudo(item)) return "";
      if (lay === "grid") {
        return `<span class="mpp-span" title="quantas colunas este card ocupa">col<input type="number" min="1" max="8" data-span="columns" value="${c}"></span>`
          + `<span class="mpp-span" title="quantas linhas este card ocupa">lin<input type="number" min="1" max="8" data-span="rows" value="${r}"></span>`;
      }
      if (lay === "horizontal") {
        return `<span class="mpp-span" title="peso da largura (1 = igual aos outros)">peso<input type="number" min="1" max="12" data-span="columns" value="${c}"></span>`;
      }
      return `<span class="mpp-span" title="peso da altura — só aparece se o painel tiver altura fixa">peso<input type="number" min="1" max="12" data-span="rows" value="${r}"></span>`;
    }

    _renderCardList() {
      const items = this._config.cards || [];
      const lay = this._layout();
      this._hintEl.textContent = lay === "grid"
        ? "Na grade, cada card pode ocupar mais de uma coluna ou linha (col / lin)."
        : lay === "horizontal"
          ? "Na fileira, o peso reparte a largura entre os cards (1 = todos iguais)."
          : "Na pilha, o peso só reparte altura quando o painel tem altura fixa.";
      this._cardsEl.innerHTML = items.map((cfg, j) =>
        `<div class="mpp-row ${this._editing && this._editing.j === j ? "on" : ""}" data-j="${j}">
           <span class="nm">${j + 1}. ${esc(itemTitle(cfg))}</span>
           ${this._spanFields(cfg)}
           <button class="mpp-ib" data-c="edit" data-j="${j}" title="editar">✎</button>
           <button class="mpp-ib" data-c="up" data-j="${j}" ${j === 0 ? "disabled" : ""} title="subir">↑</button>
           <button class="mpp-ib" data-c="down" data-j="${j}" ${j === items.length - 1 ? "disabled" : ""} title="descer">↓</button>
           <button class="mpp-ib" data-c="dup" data-j="${j}" title="duplicar">⧉</button>
           <button class="mpp-ib del" data-c="del" data-j="${j}" title="apagar">✕</button>
         </div>`).join("")
        + `<div class="mpp-row"><span class="nm"></span>
             <button class="mpp-chip add" data-c="add">+ card</button>
             <button class="mpp-chip add" data-c="adddiv">+ divisória</button>
             <button class="mpp-chip add" data-c="addgap">+ espaço</button>
           </div>`;
      this._cardsEl.querySelectorAll("[data-c]").forEach((b) =>
        b.addEventListener("click", () => this._cardAction(b.dataset.c, +b.dataset.j)));
      this._cardsEl.querySelectorAll("[data-span]").forEach((inp) =>
        inp.addEventListener("change", () => {
          const j = +inp.closest(".mpp-row").dataset.j;
          this._setSpan(j, inp.dataset.span, Math.max(1, num(inp.value, 1)));
        }));
      this._renderCardEditor();
    }

    _setSpan(j, key, value) {
      const cards = this._cardsArr();
      const item = cards[j];
      if (!item || typeof item !== "object") return;
      const go = { ...(item.grid_options || {}) };
      if (value === 1) delete go[key]; else go[key] = value;
      if (Object.keys(go).length) item.grid_options = go; else delete item.grid_options;
      cards[j] = item;
      this._setCards(cards);
    }

    _cardAction(a, j) {
      const cards = this._cardsArr();
      if (a === "add") { this._editing = { j: cards.length, adding: true }; this._renderCardEditor(); return; }
      if (a === "adddiv") { cards.push({ type: "divider" }); this._editing = null; this._setCards(cards); this._renderCardList(); return; }
      if (a === "addgap") { cards.push({ type: "spacer", size: 12 }); this._editing = null; this._setCards(cards); this._renderCardList(); return; }
      if (a === "edit") {
        this._editing = this._editing && this._editing.j === j && !this._editing.adding ? null : { j };
        this._renderCardList(); return;
      }
      if (a === "up" && j > 0) [cards[j - 1], cards[j]] = [cards[j], cards[j - 1]];
      else if (a === "down" && j < cards.length - 1) [cards[j + 1], cards[j]] = [cards[j], cards[j + 1]];
      else if (a === "dup") cards.splice(j + 1, 0, JSON.parse(JSON.stringify(cards[j])));
      else if (a === "del") cards.splice(j, 1);
      else return;
      this._editing = null;
      this._setCards(cards);
      this._renderCardList();
    }

    _writeCard(j, cfg) {
      const cards = this._cardsArr();
      // span já escolhido na lista não se perde quando o editor do HA devolve
      // a config do card (ele não conhece grid_options do nosso painel)
      const prev = cards[j];
      if (prev && typeof prev === "object" && prev.grid_options && !cfg.grid_options) {
        cfg = { ...cfg, grid_options: prev.grid_options };
      }
      if (j >= cards.length) cards.push(cfg); else cards[j] = cfg;
      this._setCards(cards);
      // só os rótulos: recriar o editor a cada tecla mataria o foco de quem digita
      const atual = this._config.cards || [];
      this._cardsEl.querySelectorAll(".mpp-row .nm").forEach((el, k) => {
        if (atual[k]) el.textContent = `${k + 1}. ${itemTitle(atual[k])}`;
      });
    }

    _renderPseudoEditor(host, item, j) {
      const form = document.createElement("ha-form");
      form.hass = this._hass;
      form.computeLabel = (f) => ({
        label: "Rótulo no meio da linha", inset: "Recuo nas pontas",
        thickness: "Espessura", style: "Desenho", color: "Cor", size: "Tamanho",
      }[f.name] || f.name);
      form.schema = item.type === "spacer"
        ? [{ name: "size", selector: { number: { min: 0, max: 200, step: 2, mode: "box", unit_of_measurement: "px" } } }]
        : [
          { name: "label", selector: { text: {} } },
          {
            name: "", type: "grid", schema: [
              { name: "style", selector: { select: { mode: "dropdown", options: [{ value: "", label: "Como o painel" }, ...SEPSTYLE_OPTIONS] } } },
              { name: "thickness", selector: { number: { min: 1, max: 6, step: 1, mode: "box", unit_of_measurement: "px" } } },
              { name: "inset", selector: { number: { min: 0, max: 80, step: 1, mode: "box", unit_of_measurement: "px" } } },
            ],
          },
          { name: "color", selector: { text: {} } },
        ];
      form.data = { ...item };
      form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const v = { ...ev.detail.value };
        const next = { type: item.type };
        for (const [k, val] of Object.entries(v)) {
          if (val === undefined || val === null || val === "") continue;
          next[k] = val;
        }
        this._writeCard(j, next);
      });
      host.appendChild(form);
    }

    async _renderCardEditor() {
      this._cardEditEl.innerHTML = "";
      this._cardEditor = null;
      this._picker = null;
      if (!this._editing) return;
      const { j, adding } = this._editing;
      const items = this._config.cards || [];
      const box = document.createElement("div");
      box.className = "mpp-edit";
      box.innerHTML = `<div class="top"><span>${adding ? "Novo card" : `Item ${j + 1}`}</span>
        <span style="flex:1"></span><button class="mpp-ib" data-close="1" title="fechar">✕</button></div>
        <div class="host"></div>`;
      box.querySelector("[data-close]").addEventListener("click", () => { this._editing = null; this._renderCardList(); });
      this._cardEditEl.appendChild(box);
      const host = box.querySelector(".host");

      if (!adding && isPseudo(items[j])) { this._renderPseudoEditor(host, items[j], j); return; }

      const ok = await loadHuiEditors();
      if (this._editing && adding && ok && customElements.get("hui-card-picker")) {
        const picker = document.createElement("hui-card-picker");
        picker.hass = this._hass;
        picker.lovelace = this._lovelace;
        picker.addEventListener("config-changed", (ev) => {
          ev.stopPropagation();
          this._writeCard(j, ev.detail.config);
          this._editing = { j };          // escolheu o tipo → já abre o editor dele
          this._renderCardList();
        });
        this._picker = picker;
        host.appendChild(picker);
        return;
      }

      const current = adding
        ? { type: "markdown", content: "Conteúdo do card" }
        : (this._config.cards || [])[j];

      if (ok) {
        const ed = document.createElement("hui-card-element-editor");
        ed.hass = this._hass;
        ed.lovelace = this._lovelace;
        ed.value = current;
        ed.addEventListener("config-changed", (ev) => {
          ev.stopPropagation();
          if (ev.detail && ev.detail.config) this._writeCard(j, ev.detail.config);
        });
        this._cardEditor = ed;
        host.appendChild(ed);
        if (adding) { this._writeCard(j, current); this._editing = { j }; this._renderCardList(); }
        return;
      }

      // plano B: o HA não entregou os editores internos. JSON cru resolve e é
      // honesto — melhor um textarea que funciona do que uma tela quebrada.
      host.innerHTML = `<textarea class="mpp-ta" spellcheck="false"></textarea><div class="mpp-warn"></div>`;
      const ta = host.querySelector("textarea");
      const warn = host.querySelector(".mpp-warn");
      warn.textContent = "Editor visual do HA indisponível — configuração em JSON.";
      ta.value = JSON.stringify(current, null, 2);
      ta.addEventListener("change", () => {
        try {
          const cfg = JSON.parse(ta.value);
          warn.textContent = "";
          this._writeCard(j, cfg);
          this._renderCardList();
        } catch (e) { warn.textContent = `JSON inválido: ${e.message}`; }
      });
    }

    /* --------------------------- aparência --------------------------- */

    _renderMainForm() {
      const c = { ...DEFAULTS, ...this._config };
      this._form.hass = this._hass;
      this._form.schema = [
        { name: "header", selector: { text: {} } },
        ...(c.header || c.header_icon ? [{ name: "header_icon", selector: { icon: {} } }] : []),
        {
          name: "", type: "grid", schema: [
            { name: "paper_color", selector: { select: { mode: "dropdown", options: c.paper_dark === true ? paperDarkOptions() : paperOptions() } } },
            { name: "depth", selector: { select: { mode: "dropdown", options: DEPTH_OPTIONS } } },
          ],
        },
        { name: "paper_dark", selector: { boolean: {} } },
        { name: "shell", selector: { boolean: {} } },
        {
          name: "", type: "grid", schema: [
            ...(c.shell === false ? [] : [{ name: "shell_radius", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } }]),
            { name: "panel_radius", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } },
            ...(c.shell === false ? [] : [{ name: "padding", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } }]),
            { name: "content_padding", selector: { number: { min: 0, max: 60, step: 1, mode: "box", unit_of_measurement: "px" } } },
            { name: "panel_min_height", selector: { number: { min: 0, max: 900, step: 4, mode: "box", unit_of_measurement: "px" } } },
          ],
        },
        {
          name: "", type: "grid", schema: [
            { name: "child_relief", selector: { select: { mode: "dropdown", options: RELIEF_OPTIONS } } },
            ...(c.child_relief === "none" ? [] : [
              { name: "child_radius", selector: { number: { min: 0, max: 40, step: 1, mode: "box", unit_of_measurement: "px" } } },
              { name: "child_padding", selector: { number: { min: 0, max: 40, step: 1, mode: "box", unit_of_measurement: "px" } } },
            ]),
          ],
        },
        { name: "flat_children", selector: { boolean: {} } },
      ];
      const data = { ...c };
      delete data.cards;
      this._form.data = data;
    }

    _onMainForm(ev) {
      ev.stopPropagation();
      const v = { ...ev.detail.value };
      delete v.cards;
      const patch = {};
      for (const [k, val] of Object.entries(v)) {
        if (val === undefined || val === null) continue;
        patch[k] = val;
      }
      this._patch(patch);
      this._renderMainForm();   // campos condicionais (casca, relevo dos filhos)
    }

    /* ------------------------------ cores ------------------------------ */

    _renderColors() {
      const rows = COLOR_FIELDS.map((name) => {
        const cur = this._config[name] ?? DEFAULTS[name] ?? "";
        const col = parseColor(cur || "rgba(128,128,128,1)");
        return `<div class="mpp-crow" data-name="${name}">
          <span class="lbl">${LABELS[name] || name}</span>
          <input type="color" value="${toHex(col)}" title="cor">
          <input type="range" min="0" max="1" step="0.01" value="${col.a}" title="transparência (alfa)">
          <code>${esc(cur || "—")}</code>
        </div>`;
      }).join("");
      this._colorsEl.className = "mpp-sec";
      this._colorsEl.innerHTML =
        `<summary>Cores (clique para ajustar — cor + transparência)</summary>${rows}`;
      this._colorsEl.querySelectorAll(".mpp-crow").forEach((rowEl) => {
        const name = rowEl.dataset.name;
        const apply = () => {
          const hex = rowEl.querySelector("input[type=color]").value;
          const a = parseFloat(rowEl.querySelector("input[type=range]").value);
          const { r, g, b } = parseColor(hex);
          this._patch({ [name]: toRgba({ r, g, b, a }) });
          rowEl.querySelector("code").textContent = this._config[name] || "—";
        };
        rowEl.querySelector("input[type=color]").addEventListener("input", apply);
        rowEl.querySelector("input[type=range]").addEventListener("input", apply);
      });
    }
  }

  customElements.define("mw-paper-panel-card", MwPaperPanelCard);
  customElements.define("mw-paper-panel-card-editor", MwPaperPanelCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "mw-paper-panel-card",
    name: "MW Paper Panel Card",
    description: "Painel de papel com relevo 3D que hospeda outros cards — pilha, fileira ou grade, com divisórias.",
    preview: true,
    documentationURL: "https://github.com/visaodeempresa/mw-ha-paper-panel-card",
  });

  console.info("%c MW-PAPER-PANEL-CARD %c 0.1.0 ", "background:#1a1a1a;color:#fdfaf3;font-weight:700;", "background:#e8e3d8;color:#1a1a1a;font-weight:700;");
})();
