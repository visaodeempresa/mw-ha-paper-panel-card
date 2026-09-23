/* Stubs da bancada: fazem o mw-paper-panel-card rodar no navegador sem Home
 * Assistant. Usado por tools/preview.html. Os "cards de dentro" aqui são
 * desenhos de mentira — quem está sendo conferido é o painel.
 */
(() => {
  "use strict";

  customElements.define("ha-card", class extends HTMLElement {
    connectedCallback() {
      if (this._d) return; this._d = true;
      this.attachShadow({ mode: "open" }).innerHTML =
        `<style>:host{display:block;background:var(--ha-card-background,var(--card-background-color));
          border-radius:var(--ha-card-border-radius,16px);color:var(--primary-text-color)}</style><slot></slot>`;
    }
  });

  // >>> bench-ha-icon v1 — fonte canônica: /Volumes/SSD-T1-01/CLAUDE-SSD/IA/lib/bench-ha-icon/bench-ha-icon.js
  // Dublê de <ha-icon> que desenha o ícone DE VERDADE (path do MDI em <svg>
  // ocupando a caixa toda), para o tamanho vir do CSS do card como no HA.
  // Ícone sem path vira losango VERMELHO: erro tem que gritar, e bolinha
  // discreta já fez a bancada inteira mentir uma vez.
  const BENCH_ICON_MISSING = "M11 15.5H12.5V17H11V15.5M12 6.95C14.7 7.06 15.87 9.78 14.28 11.81C13.86 12.31 13.19 12.64 12.85 13.07C12.5 13.5 12.5 14 12.5 14.5H11C11 13.65 11 12.94 11.35 12.44C11.68 11.94 12.35 11.64 12.77 11.31C14 10.18 13.68 8.59 12 8.46C11.18 8.46 10.5 9.13 10.5 9.97H9C9 8.3 10.35 6.95 12 6.95M12 2C11.5 2 11 2.19 10.59 2.59L2.59 10.59C1.8 11.37 1.8 12.63 2.59 13.41L10.59 21.41C11.37 22.2 12.63 22.2 13.41 21.41L21.41 13.41C22.2 12.63 22.2 11.37 21.41 10.59L13.41 2.59C13 2.19 12.5 2 12 2M12 4L20 12L12 20L4 12Z";
  const defineBenchHaIcon = (paths) => customElements.define("ha-icon", class extends HTMLElement {
    static get observedAttributes() { return ["icon"]; }
    _benchPaint() {
      const name = String(this.getAttribute("icon") || "").replace(/^mdi:/, "");
      const d = (paths || {})[name];
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML =
        `<style>:host{display:block;line-height:0}svg{width:100%;height:100%;display:block}</style>`
        + `<svg viewBox="0 0 24 24" aria-hidden="true">`
        + `<path fill="${d ? "currentColor" : "#e11d48"}" d="${d || BENCH_ICON_MISSING}"></path></svg>`;
      this.title = d ? "" : `bancada: ícone "${name}" sem path — ver o mapa MDI deste repo`;
    }
    attributeChangedCallback() { this._benchPaint(); }
    connectedCallback() { this._benchPaint(); }
  });
  // <<< bench-ha-icon v1

  /* Paths dos ícones que ESTA bancada usa (o bloco acima é só a máquina de
     desenhar). Para acrescentar:
       IA/lib/bench-ha-icon/tools/mdi-paths.sh --from tools/bench-stubs.js
     Paths: Material Design Icons (@mdi/js v7.4.47), Apache-2.0. */
  const MDI = {
    "account": "M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z",
    "account-outline": "M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6M12,13C14.67,13 20,14.33 20,17V20H4V17C4,14.33 9.33,13 12,13M12,14.9C9.03,14.9 5.9,16.36 5.9,17V18.1H18.1V17C18.1,16.36 14.97,14.9 12,14.9Z",
    "air-conditioner": "M6.59,0.66C8.93,-1.15 11.47,1.06 12.04,4.5C12.47,4.5 12.89,4.62 13.27,4.84C13.79,4.24 14.25,3.42 14.07,2.5C13.65,0.35 16.06,-1.39 18.35,1.58C20.16,3.92 17.95,6.46 14.5,7.03C14.5,7.46 14.39,7.89 14.16,8.27C14.76,8.78 15.58,9.24 16.5,9.06C18.63,8.64 20.38,11.04 17.41,13.34C15.07,15.15 12.53,12.94 11.96,9.5C11.53,9.5 11.11,9.37 10.74,9.15C10.22,9.75 9.75,10.58 9.93,11.5C10.35,13.64 7.94,15.39 5.65,12.42C3.83,10.07 6.05,7.53 9.5,6.97C9.5,6.54 9.63,6.12 9.85,5.74C9.25,5.23 8.43,4.76 7.5,4.94C5.37,5.36 3.62,2.96 6.59,0.66M5,16H7A2,2 0 0,1 9,18V24H7V22H5V24H3V18A2,2 0 0,1 5,16M5,18V20H7V18H5M12.93,16H15L12.07,24H10L12.93,16M18,16H21V18H18V22H21V24H18A2,2 0 0,1 16,22V18A2,2 0 0,1 18,16Z",
    "fan": "M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12.5,2C17,2 17.11,5.57 14.75,6.75C13.76,7.24 13.32,8.29 13.13,9.22C13.61,9.42 14.03,9.73 14.35,10.13C18.05,8.13 22.03,8.92 22.03,12.5C22.03,17 18.46,17.1 17.28,14.73C16.78,13.74 15.72,13.3 14.79,13.11C14.59,13.59 14.28,14 13.88,14.34C15.87,18.03 15.08,22 11.5,22C7,22 6.91,18.42 9.27,17.24C10.25,16.75 10.69,15.71 10.89,14.79C10.4,14.59 9.97,14.27 9.65,13.87C5.96,15.85 2,15.07 2,11.5C2,7 5.56,6.89 6.74,9.26C7.24,10.25 8.29,10.68 9.22,10.87C9.41,10.39 9.73,9.97 10.14,9.65C8.15,5.96 8.94,2 12.5,2Z",
    "home": "M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",
    "lightbulb": "M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z",
    "map-marker": "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z",
    "menu": "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",
    "weather-partly-cloudy": "M12.74,5.47C15.1,6.5 16.35,9.03 15.92,11.46C17.19,12.56 18,14.19 18,16V16.17C18.31,16.06 18.65,16 19,16A3,3 0 0,1 22,19A3,3 0 0,1 19,22H6A4,4 0 0,1 2,18A4,4 0 0,1 6,14H6.27C5,12.45 4.6,10.24 5.5,8.26C6.72,5.5 9.97,4.24 12.74,5.47M11.93,7.3C10.16,6.5 8.09,7.31 7.31,9.07C6.85,10.09 6.93,11.22 7.41,12.13C8.5,10.83 10.16,10 12,10C12.7,10 13.38,10.12 14,10.34C13.94,9.06 13.18,7.86 11.93,7.3M13.55,3.64C13,3.4 12.45,3.23 11.88,3.12L14.37,1.82L15.27,4.71C14.76,4.29 14.19,3.93 13.55,3.64M6.09,4.44C5.6,4.79 5.17,5.19 4.8,5.63L4.91,2.82L7.87,3.5C7.25,3.71 6.65,4.03 6.09,4.44M18,9.71C17.91,9.12 17.78,8.55 17.59,8L19.97,9.5L17.92,11.73C18.03,11.08 18.05,10.4 18,9.71M3.04,11.3C3.11,11.9 3.24,12.47 3.43,13L1.06,11.5L3.1,9.28C3,9.93 2.97,10.61 3.04,11.3M19,18H16V16A4,4 0 0,0 12,12A4,4 0 0,0 8,16H6A2,2 0 0,0 4,18A2,2 0 0,0 6,20H19A1,1 0 0,0 20,19A1,1 0 0,0 19,18Z",
  };
  defineBenchHaIcon(MDI);

  /* Cards de mentira: o painel só sabe que recebeu um elemento com hass.
     createCardElement devolve um retângulo etiquetado, que é o suficiente
     para conferir arranjo, span e divisórias. */
  const demoCard = (cfg) => {
    const el = document.createElement("div");
    el.style.cssText = "box-sizing:border-box;padding:12px 14px;border-radius:12px;"
      + "background:var(--ha-card-background,rgba(0,0,0,.05));font:13px/1.35 system-ui;"
      + "color:var(--primary-text-color);box-shadow:var(--ha-card-box-shadow,0 1px 2px rgba(0,0,0,.2));";
    if (cfg && cfg.demo === "row") {
      el.style.cssText += "display:flex;align-items:center;justify-content:space-between;padding:10px 2px;background:none;box-shadow:none;";
      el.innerHTML = `<span>${cfg.left || "Tempo"}</span><b>${cfg.right || "4 min"}</b>`;
    } else if (cfg && cfg.demo === "icon") {
      el.style.cssText += "display:flex;align-items:center;justify-content:center;height:44px;padding:0;background:none;box-shadow:none;";
      el.innerHTML = `<ha-icon icon="${cfg.icon || "mdi:home"}" style="width:26px;height:26px"></ha-icon>`;
    } else {
      el.textContent = cfg && (cfg.title || cfg.content || cfg.type) || "card";
    }
    el.getCardSize = () => 1;
    return el;
  };
  // aninhar painel dentro de painel é caso de uso real (a fileira de ícones
  // do rodapé da referência), então este NÃO é dublê: é o card de verdade.
  const createCardElement = (cfg) => {
    if (cfg && cfg.type === "custom:mw-paper-panel-card") {
      const el = document.createElement("mw-paper-panel-card");
      el.setConfig(cfg);
      el.hass = { states: {}, callService() {} };
      return el;
    }
    return demoCard(cfg);
  };
  window.loadCardHelpers = async () => ({ createCardElement });

  window.MW_CASES = {
    rota: {
      title: "Pilha vertical · divisórias automáticas (a foto de referência)", width: 300,
      cfg: {
        shell: false, paper_color: "paper", depth: "3d", panel_radius: 28, content_padding: 20,
        separators: "between", separator_inset: 2, gap: 4,
        layout: "vertical",
        cards: [
          { demo: "row", left: "7 Hetman St", right: "96 Brey Ln" },
          { demo: "row", left: "Tempo", right: "4 min" },
          { demo: "row", left: "Distância", right: "0.8 mi" },
          { demo: "row", left: "Chegada", right: "09:35" },
          { type: "divider", inset: 0 },
          {
            type: "custom:mw-paper-panel-card",
            shell: false, depth: "flat", content_padding: 0, layout: "horizontal", gap: 0,
            cards: [
              { demo: "icon", icon: "mdi:home" }, { demo: "icon", icon: "mdi:map-marker" },
              { demo: "icon", icon: "mdi:account" }, { demo: "icon", icon: "mdi:menu" },
            ],
          },
        ],
      },
    },
    foto: {
      title: "Imagem de fundo · o relevo continua por cima dela", width: 320,
      cfg: {
        shell: false, panel_radius: 30, content_padding: 18, volume: 2.5,
        background_image: "../docs/exemplo-fundo.svg",
        background_dim: 0.28, content_text_color: "rgba(255,255,255,0.95)",
        separators: "between", separator_color: "rgba(255,255,255,0.22)",
        panel_min_height: 300, gap: 4,
        cards: [
          { demo: "row", left: "Volo", right: "09:35" },
          { demo: "row", left: "Tempo", right: "4 min" },
          { demo: "row", left: "Distância", right: "0.8 mi" },
        ],
      },
    },
    foto_moldura: {
      title: "Foto com moldura de papel · volume 2,5", width: 320,
      cfg: {
        shell_color: "#2b3640", paper_color: "blue-5", volume: 2.5,
        background_image: "../docs/exemplo-fundo.svg",
        background_inset: 10, background_blur: 3, background_dim: 0.15,
        header: "CHEGADA", header_icon: "mdi:map-marker",
        content_padding: 14, panel_min_height: 260,
        child_relief: "sunken", child_padding: 10,
        cards: [
          { title: "96 Brey Ln" },
          { demo: "icon", icon: "mdi:map-marker" },
        ],
      },
    },
    preset_aba: {
      title: "Estilo pronto «aba-numerada»", width: 260,
      cfg: {
        preset: "aba-numerada", accent_color: "#f5a524", accent_label: "1",
        badge_icon: "mdi:account-outline", badge_size: 40, badge_position: "top-left",
        cards: [
          { title: "LOREM IPSUM" },
          { demo: "row", left: "Consumo", right: "1,2 kWh" },
        ],
      },
    },
    preset_faixa: {
      title: "Estilo pronto «faixa-lateral»", width: 420,
      cfg: {
        preset: "faixa-lateral", accent_color: "#7c3aed", accent_color2: "#ec4899",
        cards: [
          { title: "Option 01", grid_options: { columns: 1 } },
          { demo: "icon", icon: "mdi:lightbulb" },
          { title: "Lorem ipsum é só texto de exemplo.", grid_options: { columns: 2 } },
        ],
      },
    },
    preset_cabecalho: {
      title: "Estilo pronto «cabeçalho-colorido»", width: 260,
      cfg: {
        preset: "cabecalho-colorido", accent_color: "#0ea5a4",
        badge_icon: "mdi:map-marker", badge_size: 46,
        paper_dark: true, paper_color: "indigo-6",
        cards: [
          { title: "CONSECTETUR" },
          { demo: "row", left: "Estado", right: "Aberto" },
        ],
      },
    },
    preset_vidro: {
      title: "Estilo pronto «vidro-fosco» sobre a foto", width: 300,
      cfg: {
        preset: "vidro-fosco", background_image: "../docs/exemplo-fundo.svg",
        panel_min_height: 220, separators: "between", gap: 4,
        cards: [
          { demo: "row", left: "Volo", right: "09:35" },
          { demo: "row", left: "Tempo", right: "4 min" },
        ],
      },
    },
    grade: {
      title: "Grade 3 colunas · span no primeiro card", width: 340,
      cfg: {
        header: "ESCRITÓRIO", shell_color: "#a5123f", layout: "grid", columns: 3,
        paper_color: "red-2", child_relief: "sunken", child_padding: 8,
        cards: [
          { title: "Luz principal", grid_options: { columns: 3 } },
          { demo: "icon", icon: "mdi:lightbulb" },
          { demo: "icon", icon: "mdi:fan" },
          { demo: "icon", icon: "mdi:air-conditioner" },
        ],
      },
    },
    fileira: {
      title: "Fileira horizontal · pesos 2 / 1 / 1", width: 360,
      cfg: {
        header: "CLIMA", header_icon: "mdi:weather-partly-cloudy", shell_color: "#14532d",
        layout: "horizontal", paper_color: "green-2", separators: "between", gap: 10,
        cards: [
          { title: "Agora", grid_options: { columns: 2 } },
          { title: "Máx" },
          { title: "Mín" },
        ],
      },
    },
    noite: {
      title: "Papel de noite · divisória com rótulo", width: 300,
      cfg: {
        shell_color: "#1f2937", paper_dark: true, paper_color: "indigo-3",
        separator_style: "line", child_relief: "raised", child_padding: 8, gap: 8,
        cards: [
          { type: "divider", label: "Quarto" },
          { title: "Ar-condicionado" },
          { type: "divider", label: "Suíte" },
          { title: "Umidificador" },
        ],
      },
    },
    chapado: {
      title: "Sem casca e sem relevo · grade 2×", width: 300,
      cfg: {
        shell: false, depth: "flat", layout: "grid", columns: 2, paper_color: "blue-1",
        separators: "none", child_relief: "sunken", child_padding: 10,
        cards: [{ title: "A" }, { title: "B" }, { title: "C", grid_options: { columns: 2 } }],
      },
    },
  };
})();
