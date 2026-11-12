const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export async function localizarCidades(cidade) {
  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({ name: cidade, count: "10", language: "pt", format: "json" });
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Serviço de localização indisponível");
  const payload = await response.json();
  return (payload.results ?? []).map((place) => ({
    nome: place.name,
    estado: place.admin1 ?? null,
    pais: place.country ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    fusoHorario: place.timezone ?? "auto"
  }));
}
