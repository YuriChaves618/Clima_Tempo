const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function obterPrevisao(local) {
  const url = new URL(FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: String(local.latitude), longitude: String(local.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index,cloud_cover",
    daily: "temperature_2m_min,temperature_2m_max,weather_code,sunrise,sunset,precipitation_sum",
    forecast_days: "5", timezone: local.fusoHorario, wind_speed_unit: "kmh"
  });
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Serviço meteorológico indisponível");
  const data = await response.json();
  if (!data.current || !data.daily?.time) throw new Error("Resposta meteorológica inválida");
  return {
    atual: {
      temperatura: data.current.temperature_2m,
      umidade: data.current.relative_humidity_2m,
      sensacaoTermica: data.current.apparent_temperature,
      precipitacao: data.current.precipitation,
      codigoClima: data.current.weather_code,
      vento: data.current.wind_speed_10m,
      direcaoVento: data.current.wind_direction_10m,
      indiceUv: data.current.uv_index,
      coberturaNuvens: data.current.cloud_cover,
      observadoEm: data.current.time
    },
    previsao: data.daily.time.map((date, index) => ({
      data: date,
      minima: data.daily.temperature_2m_min[index],
      maxima: data.daily.temperature_2m_max[index],
      codigoClima: data.daily.weather_code[index],
      nascerSol: data.daily.sunrise[index],
      porSol: data.daily.sunset[index],
      precipitacaoTotal: data.daily.precipitation_sum[index]
    }))
  };
}
