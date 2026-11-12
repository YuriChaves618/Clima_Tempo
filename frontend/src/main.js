import "./style.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");
const $ = (selector) => document.querySelector(selector);
const state = { history: [], localities: [], currentCity: null };
const weatherPhotos = {
  sunny: { url: "https://images.unsplash.com/photo-1584316393112-5ac374f4a49c?auto=format&fit=crop&w=1800&q=85", label: "Foto: Peter Chiykowski / Unsplash", link: "https://unsplash.com/photos/green-mountains-under-white-clouds-and-blue-sky-during-daytime-MdzJEbrBT70" },
  clouds: { url: "https://images.unsplash.com/photo-1477854378975-90f49cf366df?auto=format&fit=crop&w=1800&q=85", label: "Foto: Medena Rosa / Unsplash", link: "https://unsplash.com/photos/cloudy-sky-CUG7Z1MBqu8" },
  rain: { url: "https://images.unsplash.com/photo-1519375949920-4abac1c29cc4?auto=format&fit=crop&w=1800&q=85", label: "Foto: Bulb Creative / Unsplash", link: "https://unsplash.com/photos/grayscale-landscape-photography-of-a-foggy-forest-z1E4knAkLas" },
  storm: { url: "https://images.unsplash.com/photo-1560928863-e140ee0fc733?auto=format&fit=crop&w=1800&q=85", label: "Foto: Paul Zoetemeijer / Unsplash", link: "https://unsplash.com/photos/dark-grey-storm-clouds-AtxeOe04PQ8" }
};

const weatherLabels = {
  0: "Céu limpo", 1: "Predomínio de sol", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Neblina", 48: "Neblina", 51: "Garoa leve", 53: "Garoa", 55: "Garoa forte",
  61: "Chuva leve", 63: "Chuva", 65: "Chuva forte", 71: "Neve leve", 73: "Neve",
  75: "Neve forte", 80: "Pancadas leves", 81: "Pancadas de chuva", 82: "Pancadas fortes",
  95: "Trovoadas", 96: "Trovoadas", 99: "Trovoadas fortes"
};

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${API_URL}.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || "Não foi possível concluir a solicitação.");
  return data;
}

function showNotice(message, type = "error") {
  const notice = $("#notice");
  notice.textContent = message;
  notice.className = `notice ${type}`;
  notice.hidden = false;
}

function clearNotice() { $("#notice").hidden = true; }
function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(".", "");
}
function weatherIcon(code) {
  if ([0, 1].includes(code)) return "☀";
  if ([2, 3, 45, 48].includes(code)) return "☁";
  if (code >= 95) return "ϟ";
  if (code >= 51) return "☂";
  return "☼";
}

function renderForecast(city) {
  state.currentCity = city;
  $("#weather-section").hidden = false;
  $("#weather-title").textContent = [city.cidade, city.estado, city.pais].filter(Boolean).join(", ");
  const current = city.condicoesAtuais || {};
  const today = city.previsao?.[0] || {};
  const weatherType = weatherCategory(current.codigoClima);
  const weatherPhoto = weatherPhotos[weatherType] || weatherPhotos.clouds;
  const visual = $("#weather-visual");
  visual.dataset.weather = weatherType;
  visual.style.backgroundImage = `linear-gradient(90deg,rgba(13,40,43,.54),rgba(19,46,45,.04) 78%),linear-gradient(0deg,rgba(12,37,36,.56),transparent 58%),url("${weatherPhoto.url}")`;
  $("#photo-credit").href = weatherPhoto.link;
  $("#photo-credit").textContent = weatherPhoto.label;
  $("#coordinates").textContent = `Latitude ${Number(city.latitude).toFixed(4)}° · Longitude ${Number(city.longitude).toFixed(4)}°`;
  const observed = current.observadoEm ? formatObservation(current.observadoEm, city.fusoHorario) : "";
  $("#observed-at").textContent = observed ? `Observação: ${observed}` : "";
  $("#current-icon").textContent = weatherIcon(current.codigoClima);
  $("#current-temp").textContent = current.temperatura == null ? "--°" : `${Math.round(current.temperatura)}°`;
  $("#current-condition").textContent = weatherLabels[current.codigoClima] || "Condição variável";
  $("#condition-code").textContent = `Código WMO ${current.codigoClima ?? "—"}`;
  $("#local-time").textContent = current.observadoEm?.split("T")[1] || "Horário local";
  $("#sunset-label").textContent = today.porSol ? `Pôr do sol às ${today.porSol.split("T")[1]}` : "Acompanhe o pôr do sol";
  $("#humidity").textContent = current.umidade == null ? "—" : `${Math.round(current.umidade)}%`;
  $("#wind").textContent = current.vento == null ? "—" : `${Math.round(current.vento)} km/h · ${windDirection(current.direcaoVento)} (${Math.round(current.direcaoVento)}°)`;
  $("#feels-like").textContent = current.sensacaoTermica == null ? "—" : `${Math.round(current.sensacaoTermica)} °C`;
  $("#precipitation").textContent = current.precipitacao == null ? "—" : `${Number(current.precipitacao).toLocaleString("pt-BR")} mm`;
  $("#uv-index").textContent = current.indiceUv == null ? "—" : Number(current.indiceUv).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  $("#sunset-time").textContent = today.porSol?.split("T")[1] || "—";
  $("#forecast-grid").innerHTML = city.previsao.map((day, index) => `
    <article class="forecast-day-card ${index === 0 ? "today" : ""}">
      <span class="forecast-day">${index === 0 ? "Hoje" : formatDate(day.data)}</span>
      <span class="forecast-icon">${weatherIcon(day.codigoClima)}</span>
      <span class="forecast-condition">${weatherLabels[day.codigoClima] || "Condição variável"}</span>
      <span class="forecast-temperatures"><strong>${Math.round(day.maxima)}°</strong><span>${Math.round(day.minima)}°</span></span>
      <span class="forecast-rain">☂ ${Number(day.precipitacaoTotal || 0).toLocaleString("pt-BR")} mm</span>
    </article>`).join("");
  $("#weather-section").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function windDirection(degrees = 0) {
  return ["N", "NE", "L", "SE", "S", "SO", "O", "NO"][Math.round((degrees % 360) / 45) % 8];
}

function weatherCategory(code) {
  if (code === 0 || code === 1) return "sunny";
  if ([2, 3, 45, 48].includes(code)) return "clouds";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 95) return "storm";
  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return "clouds";
  return "clouds";
}

function formatObservation(value, timeZone) {
  const [datePart, timePart] = value.split("T");
  const date = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  }).format(new Date(`${datePart}T12:00:00Z`));
  return `${date} às ${timePart} · ${timeZone || "horário local"}`;
}

function showLocationOptions(localities) {
  state.localities = localities;
  const picker = $("#location-picker");
  $("#location-count").textContent = `Encontramos ${localities.length} ${localities.length === 1 ? "localidade" : "localidades"}. Escolha a cidade correta.`;
  $("#location-select").innerHTML = localities.map((local, index) => {
    const place = [local.nome, local.estado, local.pais].filter(Boolean).join(", ");
    return `<option value="${index}">${escapeHtml(place)} · ${Number(local.latitude).toFixed(2)}, ${Number(local.longitude).toFixed(2)}</option>`;
  }).join("");
  picker.hidden = false;
  $("#weather-button").disabled = false;
}

function renderHistory() {
  const list = $("#history-list");
  $("#history-count").textContent = `${state.history.length} / 5`;
  if (!state.history.length) {
    list.innerHTML = '<div class="empty-state"><span>⌕</span><p>Suas cidades consultadas aparecerão aqui.</p></div>';
  } else {
    list.innerHTML = state.history.map((city, index) => `
      <button class="history-item" type="button" data-city="${escapeAttribute(city.cidade)}">
        <span class="history-number">0${index + 1}</span><span class="history-name">${escapeHtml(city.cidade)}<small>${escapeHtml([city.estado, city.pais].filter(Boolean).join(", "))}</small></span>
        <span class="history-temp">${Math.round(city.previsao[0]?.maxima ?? 0)}° <small>/ ${Math.round(city.previsao[0]?.minima ?? 0)}°</small></span><span class="history-arrow">↗</span>
      </button>`).join("");
    list.querySelectorAll(".history-item").forEach((button) => button.addEventListener("click", () => {
      const city = state.history.find((item) => item.cidade === button.dataset.city);
      if (city) { clearNotice(); renderForecast(city); }
    }));
  }
  updateSelects();
}

function updateSelects() {
  const options = state.history.map((city) => `<option value="${escapeAttribute(city.cidade)}">${escapeHtml(city.cidade)}</option>`).join("");
  for (const selector of ["#city-one", "#city-two"]) {
    const select = $(selector);
    const previous = select.value;
    select.innerHTML = state.history.length ? `<option value="">Escolha uma cidade</option>${options}` : '<option value="">Consulte uma cidade primeiro</option>';
    if (state.history.some((city) => city.cidade === previous)) select.value = previous;
    select.disabled = state.history.length < 2;
  }
  $("#compare-button").disabled = state.history.length < 2;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function escapeAttribute(value = "") { return escapeHtml(value); }

async function loadHistory() {
  const result = await api("/api/historico");
  state.history = result.cidades || [];
  renderHistory();
}

$("#search-form").addEventListener("submit", async (event) => {
  event.preventDefault(); clearNotice();
  const button = $("#search-button");
  const cityName = $("#city-input").value.trim();
  $("#location-picker").hidden = true;
  button.disabled = true; button.innerHTML = '<span class="spinner"></span> Buscando';
  try {
    const result = await api(`/api/localidades?cidade=${encodeURIComponent(cityName)}`);
    showLocationOptions(result.localidades);
    clearNotice();
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; button.innerHTML = 'Consultar <span>→</span>'; }
});

$("#weather-button").addEventListener("click", async () => {
  const local = state.localities[Number($("#location-select").value)];
  if (!local) return showNotice("Escolha uma localidade da lista.");
  clearNotice();
  const button = $("#weather-button"); button.disabled = true; button.innerHTML = '<span class="spinner"></span> Carregando';
  try {
    const city = await api("/api/clima", { method: "POST", body: JSON.stringify(local) });
    renderForecast(city);
    await loadHistory();
    $("#location-picker").hidden = true;
    showNotice(`Previsão de ${city.cidade} atualizada.`, "success");
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = false; button.innerHTML = 'Ver clima <span>→</span>'; }
});

$("#refresh-weather").addEventListener("click", async () => {
  if (!state.currentCity) return;
  try {
    const city = await api("/api/clima", { method: "POST", body: JSON.stringify(state.currentCity) });
    renderForecast(city);
    await loadHistory();
    showNotice(`Dados de ${city.cidade} atualizados.`, "success");
  } catch (error) { showNotice(error.message); }
});

$("#compare-form").addEventListener("submit", async (event) => {
  event.preventDefault(); clearNotice();
  const primeiraCidade = $("#city-one").value;
  const segundaCidade = $("#city-two").value;
  if (!primeiraCidade || !segundaCidade) return showNotice("Escolha duas cidades do seu histórico.");
  if (primeiraCidade === segundaCidade) return showNotice("Escolha duas cidades diferentes para comparar.");
  const button = $("#compare-button"); button.disabled = true; button.textContent = "Comparando…";
  try {
    const comparison = await api("/api/comparar", { method: "POST", body: JSON.stringify({ primeiraCidade, segundaCidade }) });
    renderComparison(comparison);
  } catch (error) { showNotice(error.message); }
  finally { button.disabled = state.history.length < 2; button.innerHTML = 'Comparar previsões <span>→</span>'; }
});

function renderComparison(data) {
  const container = $("#compare-result");
  container.innerHTML = `<div class="comparison-label"><span>PREVISÃO DE 5 DIAS</span><button type="button" aria-label="Fechar comparação">×</button></div>
    <div class="comparison-city-head"><span>Dia</span><strong>${escapeHtml(data.primeiraCidade)}</strong><strong>${escapeHtml(data.segundaCidade)}</strong></div>
    ${data.dias.map((day) => `<div class="comparison-row"><span>${formatDate(day.data)}</span><span>${temperaturePair(day.primeira)}</span><span>${temperaturePair(day.segunda)}</span></div>`).join("")}`;
  container.hidden = false;
  container.querySelector("button").addEventListener("click", () => { container.hidden = true; });
}
function temperaturePair(values) {
  if (values.minima == null || values.maxima == null) return "—";
  return `${Math.round(values.minima)}° <i>/</i> ${Math.round(values.maxima)}°`;
}

api("/api/health").then(() => {
  $("#api-status").textContent = "API conectada";
  $(".api-status").classList.add("connected");
  return loadHistory();
}).catch(() => {
  $("#api-status").textContent = "API indisponível";
  $(".api-status").classList.add("disconnected");
  showNotice(`A API ainda não está disponível. Verifique o backend em ${API_URL}.`);
});
