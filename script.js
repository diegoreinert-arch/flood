/**
 * Configuração e dados do mapa Flood Sensor.
 * Os sensores abaixo são fictícios, apenas para demonstração.
 */
window.FloodSensor = window.FloodSensor || {};

FloodSensor.config = {
  centro: [-23.4205, -51.9333], // Maringá-PR
  zoomInicial: 14,
  zoomSensor: 16,
  zoomBusca: 17,
  nominatimUrl: "https://nominatim.openstreetmap.org/search",
  areaBusca: "-52.05,-23.33,-51.85,-23.50", // caixa em volta de Maringá-PR
  limiteCritico: 70,
  limiteAtencao: 40,
};

FloodSensor.sensores = [
  { id: "FS-001", nome: "Sensor Centro", via: "Av. Brasil, região central", bairro: "Centro", coords: [-23.4205, -51.9333], nivel: 82 },
  { id: "FS-002", nome: "Sensor Zona 7", via: "Av. Colombo, região da Zona 7", bairro: "Zona 7", coords: [-23.4104, -51.9375], nivel: 56 },
  { id: "FS-003", nome: "Sensor Vila Operária", via: "Av. Mauá, região da Vila Operária", bairro: "Vila Operária", coords: [-23.4260, -51.9270], nivel: 24 },
];

/**
 * Aparência e textos de cada status.
 *  - cor:      painel de leitura
 *  - corLista: etiqueta na lista lateral
 *  - pin:      classe CSS do marcador no mapa
 */
FloodSensor.status = {
  critico: {
    rotulo: "Crítico",
    pin: "pin-critical",
    cor: "#ff5365",
    corLista: "#ff6473",
    fundoAlerta: "#ff536514",
    bordaAlerta: "#ff536555",
    icone: "⚠",
    titulo: "Nível crítico demonstrativo",
    descricao: "A leitura simulada indica nível elevado. Verifique a situação no local por canais oficiais.",
  },
  atencao: {
    rotulo: "Atenção",
    pin: "pin-warning",
    cor: "#ffbd45",
    corLista: "#ffc65c",
    fundoAlerta: "#ffbd4514",
    bordaAlerta: "#ffbd4555",
    icone: "!",
    titulo: "Nível de atenção",
    descricao: "O nível simulado merece acompanhamento.",
  },
  normal: {
    rotulo: "Normal",
    pin: "pin-normal",
    cor: "#00e69a",
    corLista: "#00e69a",
    fundoAlerta: "#00e69a12",
    bordaAlerta: "#00e69a40",
    icone: "✓",
    titulo: "Monitoramento normal",
    descricao: "Nenhuma condição de atenção nesta leitura simulada.",
  },
};

/** Converte o nível (0–100) na chave de status. */
FloodSensor.estado = function (nivel) {
  const { limiteCritico, limiteAtencao } = FloodSensor.config;
  if (nivel >= limiteCritico) return "critico";
  if (nivel >= limiteAtencao) return "atencao";
  return "normal";
};
/**
 * Mapa Leaflet: camadas, marcadores, filtro e controles do mapa.
 */
(function (FS) {
  const { config, sensores, status, estado } = FS;

  const map = L.map("flood-map", { zoomControl: true, scrollWheelZoom: true })
    .setView(config.centro, config.zoomInicial);

  const camadaRuas = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });

  const camadaSatelite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "Tiles &copy; Esri" }
  );

  camadaRuas.addTo(map);

  const marcadores = new Map();
  let filtroAtual = "todos";

  function iconeSensor(chaveStatus) {
    return L.divIcon({
      className: "",
      html: `<div class="sensor-pin ${status[chaveStatus].pin}"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  function popupHtml(s) {
    const st = estado(s.nivel);
    return `<strong>${s.id} • ${s.nome}</strong><br>${s.via}<br>Nível demonstrativo: <b>${s.nivel}%</b><br>Status: <b>${status[st].rotulo}</b>`;
  }

  function visivelNoFiltro(chaveStatus) {
    return filtroAtual === "todos" || filtroAtual === chaveStatus;
  }

  /** Cria ou atualiza os marcadores respeitando o filtro ativo. */
  function atualizarMarcadores() {
    sensores.forEach((s) => {
      const st = estado(s.nivel);
      let marker = marcadores.get(s.id);

      if (marker) {
        marker.setIcon(iconeSensor(st));
        marker.setPopupContent(popupHtml(s));
      } else {
        marker = L.marker(s.coords, { icon: iconeSensor(st) }).bindPopup(popupHtml(s));
        marker.on("click", () => FS.painel.selecionarSensor(s));
        marcadores.set(s.id, marker);
      }

      if (visivelNoFiltro(st)) {
        if (!map.hasLayer(marker)) marker.addTo(map);
      } else {
        map.removeLayer(marker);
      }
    });
  }

  function definirFiltro(filtro) {
    filtroAtual = filtro;
  }

  function focarSensor(s) {
    map.setView(s.coords, config.zoomSensor);
    marcadores.get(s.id).openPopup();
  }

  function centralizar() {
    map.setView(config.centro, config.zoomInicial);
  }

  function usarCamada(ativa, inativa, btnAtivo, btnInativo) {
    map.removeLayer(inativa);
    ativa.addTo(map);
    btnAtivo.classList.add("active");
    btnInativo.classList.remove("active");
  }

  function iniciarControles() {
    const btnRuas = document.getElementById("street-layer");
    const btnSatelite = document.getElementById("satellite-layer");

    btnRuas.addEventListener("click", () => usarCamada(camadaRuas, camadaSatelite, btnRuas, btnSatelite));
    btnSatelite.addEventListener("click", () => usarCamada(camadaSatelite, camadaRuas, btnSatelite, btnRuas));
    document.getElementById("center-map").addEventListener("click", centralizar);

    // Garante o tamanho correto do mapa após o carregamento completo da página
    window.addEventListener("load", () => setTimeout(() => map.invalidateSize(), 200));
  }

  FS.mapa = { map, atualizarMarcadores, definirFiltro, focarSensor, iniciarControles };
})(window.FloodSensor);
/**
 * Painel lateral e painel de leitura: contadores, lista, filtros,
 * sensor selecionado e simulação de leitura.
 */
(function (FS) {
  const { sensores, status, estado } = FS;
  const $ = (id) => document.getElementById(id);

  let sensorSelecionado = sensores[0];

  /** Atualiza o painel de leitura com os dados do sensor. */
  function selecionarSensor(s) {
    sensorSelecionado = s;
    const st = status[estado(s.nivel)];

    $("selected-sensor-name").textContent = `${s.id} • ${s.bairro}`;
    $("water-level").textContent = s.nivel + "%";
    $("water-level").style.color = st.cor;
    $("water-progress").style.width = s.nivel + "%";
    $("water-progress").style.background = st.cor;
    $("water-status").textContent = "Nível " + st.rotulo.toLowerCase();
    $("sensor-status").textContent = "● Ativo";
    $("last-update").textContent = new Date().toLocaleTimeString("pt-BR");

    const caixa = $("alert-box");
    const icone = caixa.querySelector("span");
    caixa.style.background = st.fundoAlerta;
    caixa.style.borderColor = st.bordaAlerta;
    icone.textContent = st.icone;
    icone.style.color = st.cor;
    $("alert-title").textContent = st.titulo;
    $("alert-description").textContent = st.descricao;

    document.querySelectorAll(".sensor-item").forEach((el) => {
      el.classList.toggle("selected", el.dataset.id === s.id);
    });
  }

  function atualizarContadores() {
    const contar = (chave) => sensores.filter((s) => estado(s.nivel) === chave).length;
    $("count-flood").textContent = contar("critico");
    $("count-warning").textContent = contar("atencao");
    $("count-normal").textContent = contar("normal");
  }

  function renderizarLista() {
    const lista = $("sensor-list");
    lista.innerHTML = "";

    sensores.forEach((s) => {
      const st = status[estado(s.nivel)];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sensor-item" + (sensorSelecionado.id === s.id ? " selected" : "");
      btn.dataset.id = s.id;
      btn.innerHTML = `<em style="color:${st.corLista}">${st.rotulo}</em><strong>${s.id} • ${s.nome}</strong><small>${s.via} · ${s.nivel}%</small>`;
      btn.addEventListener("click", () => {
        selecionarSensor(s);
        FS.mapa.focarSensor(s);
      });
      lista.appendChild(btn);
    });
  }

  /** Redesenha mapa, contadores e lista. */
  function atualizarTudo() {
    FS.mapa.atualizarMarcadores();
    atualizarContadores();
    renderizarLista();
  }

  function iniciarFiltros() {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        FS.mapa.definirFiltro(btn.dataset.filter);
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
        atualizarTudo();
      });
    });
  }

  function iniciarSimulacao() {
    $("update-reading").addEventListener("click", () => {
      sensorSelecionado.nivel = Math.floor(Math.random() * 101);
      atualizarTudo();
      selecionarSensor(sensorSelecionado);
    });
  }

  function iniciar() {
    atualizarTudo();
    selecionarSensor(sensorSelecionado);
    iniciarFiltros();
    iniciarSimulacao();
  }

  FS.painel = { iniciar, selecionarSensor };
})(window.FloodSensor);
/**
 * Busca de endereços em Maringá via Nominatim (OpenStreetMap).
 */
(function (FS) {
  const { config } = FS;
  const $ = (id) => document.getElementById(id);

  async function buscarEndereco() {
    const termo = $("sensor-search").value.trim();
    const feedback = $("search-feedback");

    if (!termo) {
      feedback.textContent = "Digite o nome de uma rua, avenida ou bairro.";
      return;
    }

    feedback.textContent = "Buscando endereço...";

    try {
      // Nominatim não aceita "q" junto de parâmetros estruturados (city, country),
      // então a cidade vai no texto e a busca é limitada à região de Maringá.
      const params = new URLSearchParams({
        format: "jsonv2",
        limit: "1",
        countrycodes: "br",
        viewbox: config.areaBusca, // esquerda,topo,direita,base
        bounded: "1",
        "accept-language": "pt-BR",
        q: `${termo}, Maringá, Paraná`,
      });
      const url = `${config.nominatimUrl}?${params}`;
      const resposta = await fetch(url);
      if (!resposta.ok) throw new Error("Falha na busca");

      const dados = await resposta.json();
      if (!dados.length) {
        feedback.textContent = "Endereço não encontrado. Tente outro nome.";
        return;
      }

      const local = dados[0];
      const lat = Number(local.lat);
      const lon = Number(local.lon);

      FS.mapa.map.setView([lat, lon], config.zoomBusca);
      L.popup()
        .setLatLng([lat, lon])
        .setContent(`<strong>Endereço encontrado</strong><br>${local.display_name}`)
        .openOn(FS.mapa.map);
      feedback.textContent = "Local encontrado no mapa.";
    } catch (erro) {
      feedback.textContent = "Não foi possível buscar agora. Confira sua conexão e tente novamente.";
    }
  }

  function iniciar() {
    $("search-location").addEventListener("click", buscarEndereco);
    $("sensor-search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") buscarEndereco();
    });
  }

  FS.busca = { iniciar };
})(window.FloodSensor);
/**
 * Ponto de entrada: inicializa os módulos do mapa de monitoramento.
 */
(function (FS) {
  FS.mapa.iniciarControles();
  FS.painel.iniciar();
  FS.busca.iniciar();
})(window.FloodSensor);
