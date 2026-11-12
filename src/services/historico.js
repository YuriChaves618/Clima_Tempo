import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultFile = resolve(dirname(fileURLToPath(import.meta.url)), "../../data/historico.json");
const historyFile = process.env.HISTORY_FILE ? resolve(process.env.HISTORY_FILE) : defaultFile;
const MAX_CITIES = 5;

async function readHistory() {
  try {
    const content = await readFile(historyFile, "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function listarHistorico() {
  return readHistory();
}

export async function registrarConsulta(local, previsao, condicoesAtuais) {
  const history = await readHistory();
  const entry = {
    cidade: local.nome,
    estado: local.estado,
    pais: local.pais,
    latitude: local.latitude,
    longitude: local.longitude,
    fusoHorario: local.fusoHorario,
    consultadaEm: new Date().toISOString(),
    condicoesAtuais,
    previsao
  };
  // Uma cidade consultada novamente volta ao topo do histórico.
  const key = `${local.latitude},${local.longitude}`;
  const next = [entry, ...history.filter((item) => `${item.latitude},${item.longitude}` !== key)].slice(0, MAX_CITIES);
  await mkdir(dirname(historyFile), { recursive: true });
  await writeFile(historyFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return entry;
}

export async function buscarCidadeConsultada(nome) {
  const history = await readHistory();
  const normalized = nome.trim().toLocaleLowerCase("pt-BR");
  return history.find((item) => item.cidade.toLocaleLowerCase("pt-BR") === normalized) ?? null;
}
