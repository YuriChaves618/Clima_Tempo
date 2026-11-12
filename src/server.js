import express from "express";
import { localizarCidades } from "./services/localizacao.js";
import { obterPrevisao } from "./services/meteorologia.js";
import { buscarCidadeConsultada, listarHistorico, registrarConsulta } from "./services/historico.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", servico: "meteo-api" }));

function validarNomeCidade(cidade) {
  return typeof cidade === "string" && cidade.trim().length >= 2 && cidade.trim().length <= 100;
}

app.get("/api/localidades", async (req, res) => {
  const cidade = typeof req.query.cidade === "string" ? req.query.cidade.trim() : "";
  if (cidade.length < 2 || cidade.length > 100) {
    return res.status(400).json({ erro: "Informe uma cidade com 2 a 100 caracteres." });
  }
  try {
    const localidades = await localizarCidades(cidade);
    if (!localidades.length) return res.status(404).json({ erro: "Nenhuma localidade encontrada." });
    return res.json({ localidades });
  } catch (error) {
    console.error("Falha ao buscar localidades:", error.message);
    return res.status(502).json({ erro: "Serviço externo indisponível ou expirou o tempo de resposta." });
  }
});

async function consultarClima(local, res) {
  try {
    const dados = await obterPrevisao(local);
    const consulta = await registrarConsulta(local, dados.previsao, dados.atual);
    return res.status(200).json(consulta);
  } catch (error) {
    console.error("Falha na consulta meteorológica:", error.message);
    return res.status(502).json({ erro: "Serviço externo indisponível ou expirou o tempo de resposta." });
  }
}

app.post("/api/clima", async (req, res) => {
  const { nome, latitude, longitude, estado = null, pais = null, fusoHorario = "auto" } = req.body ?? {};
  if (!validarNomeCidade(nome) || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || typeof fusoHorario !== "string") {
    return res.status(400).json({ erro: "Escolha uma localidade válida antes de consultar o clima." });
  }
  return consultarClima({ nome: nome.trim(), estado, pais, latitude, longitude, fusoHorario }, res);
});

// Compatibilidade para clientes sem seleção de localidade: usa o primeiro resultado encontrado.
app.get("/api/clima", async (req, res) => {
  const cidade = typeof req.query.cidade === "string" ? req.query.cidade.trim() : "";
  if (!validarNomeCidade(cidade)) return res.status(400).json({ erro: "Informe uma cidade com 2 a 100 caracteres." });
  try {
    const localidades = await localizarCidades(cidade);
    if (!localidades.length) return res.status(404).json({ erro: "Localização não encontrada." });
    return consultarClima(localidades[0], res);
  } catch (error) {
    console.error("Falha na consulta meteorológica:", error.message);
    return res.status(502).json({ erro: "Serviço externo indisponível ou expirou o tempo de resposta." });
  }
});

app.get("/api/historico", async (_req, res) => {
  try {
    return res.json({ cidades: await listarHistorico() });
  } catch (error) {
    console.error("Falha ao ler histórico:", error.message);
    return res.status(500).json({ erro: "Não foi possível ler o histórico." });
  }
});

app.post("/api/comparar", async (req, res) => {
  const { primeiraCidade, segundaCidade } = req.body ?? {};
  if (typeof primeiraCidade !== "string" || typeof segundaCidade !== "string" ||
      primeiraCidade.trim().length < 2 || segundaCidade.trim().length < 2) {
    return res.status(400).json({ erro: "Informe os nomes de duas cidades consultadas." });
  }
  if (primeiraCidade.trim().toLocaleLowerCase("pt-BR") === segundaCidade.trim().toLocaleLowerCase("pt-BR")) {
    return res.status(400).json({ erro: "Escolha duas cidades diferentes." });
  }
  try {
    const [primeira, segunda] = await Promise.all([
      buscarCidadeConsultada(primeiraCidade), buscarCidadeConsultada(segundaCidade)
    ]);
    if (!primeira || !segunda) {
      return res.status(400).json({ erro: "Só é possível comparar cidades consultadas anteriormente.", cidadesDisponiveis: (await listarHistorico()).map((item) => item.cidade) });
    }
    const secondByDate = new Map(segunda.previsao.map((dia) => [dia.data, dia]));
    return res.json({
      primeiraCidade: primeira.cidade,
      segundaCidade: segunda.cidade,
      dias: primeira.previsao.map((dia) => {
        const diaSegunda = secondByDate.get(dia.data);
        return ({
        data: dia.data,
        primeira: { minima: dia.minima, maxima: dia.maxima },
        segunda: {
          minima: diaSegunda?.minima ?? null,
          maxima: diaSegunda?.maxima ?? null
        }
        });
      })
    });
  } catch (error) {
    console.error("Falha ao comparar cidades:", error.message);
    return res.status(500).json({ erro: "Não foi possível comparar as cidades." });
  }
});

app.use((_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

app.listen(port, () => console.log(`API Meteo disponível em http://localhost:${port}`));
