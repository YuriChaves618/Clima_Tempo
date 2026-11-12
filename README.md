# Projeto API Meteo

Aplicação provisória para consultar e comparar previsão do tempo. O backend Node.js + Express usa a API pública Open-Meteo, sem token ou chave. O frontend Vite fica em `frontend/`; API e interface podem ser publicadas separadamente no Render e no Vercel.

## Rodar localmente

Requer Node.js 20 ou superior. Em um terminal, inicie o backend:

```sh
npm install
npm start
```

Em outro terminal, inicie a interface:

```sh
cd frontend
npm install
npm run dev
```

A interface abre no endereço informado pelo Vite (normalmente `http://localhost:5173`) e usa a API em `http://localhost:3000` por padrão. Configure `PORT` para mudar a porta do backend e `HISTORY_FILE` para mudar o local do histórico.

## Publicar o backend no Render

1. Envie o repositório ao GitHub e crie um **Blueprint** no Render apontando para ele. O arquivo `render.yaml` configura o serviço Node, o comando de início e a rota de saúde.
2. Defina `CORS_ORIGIN` no Render com o domínio completo do frontend publicado no Vercel, por exemplo `https://seu-projeto.vercel.app` (sem barra final). Para permitir mais de uma origem, separe os domínios por vírgula.
3. Após o deploy, confira `https://<seu-servico>.onrender.com/api/health`.

## Publicar o frontend no Vercel

1. Importe o repositório no Vercel e configure **Root Directory** como `frontend`. O arquivo `frontend/vercel.json` já define build com Vite e saída em `dist`.
2. Em **Environment Variables**, configure `VITE_API_URL` com a URL do serviço Render, por exemplo `https://seu-servico.onrender.com` (sem barra final).
3. Faça o deploy e adicione o domínio final do Vercel à variável `CORS_ORIGIN` no Render. Depois de alterar variáveis, publique novamente os serviços.

O primeiro deploy do frontend precisa da URL pública do backend para definir `VITE_API_URL`. Após conhecer o domínio Vercel, atualize o CORS do backend.

### Histórico em produção

O histórico é gravado em arquivo. O sistema de arquivos padrão de hospedagens pode ser temporário e perder dados em reinicializações ou novos deploys. Para manter as cinco cidades entre deploys, anexe um disco persistente ao serviço Render em `/var/data` e configure `HISTORY_FILE=/var/data/historico.json`.

## Rotas

- `GET /api/localidades?cidade=Recife`: retorna até dez localidades correspondentes, com estado, país, coordenadas e fuso. Essa busca não registra consulta.
- `POST /api/clima`: recebe a localidade escolhida e retorna condições atuais e previsão diária de cinco dias; somente então registra a consulta no histórico.
- `GET /api/clima?cidade=Salvador`: rota legada que consulta o primeiro resultado, mantida para compatibilidade.
- `GET /api/historico`: lista até cinco cidades distintas, da mais recentemente consultada à mais antiga.
- `POST /api/comparar`: compara mínimas e máximas das duas cidades consultadas anteriormente.
- `GET /api/health`: verifica se o backend está ativo.

O dashboard atual inclui temperatura, condição do tempo, umidade relativa, velocidade e direção do vento, sensação térmica, precipitação, índice UV, pôr do sol e previsão de cinco dias com chuva acumulada. A paisagem troca entre fotos de sol, céu nublado, chuva e tempestade conforme o código de condição atual da Open-Meteo. As fotos são carregadas do Unsplash e exibem crédito com link para a página de cada fotógrafo; é necessária conexão à internet para carregar as imagens.

Exemplo de comparação:

```json
{
  "primeiraCidade": "Salvador",
  "segundaCidade": "Candeias"
}
```

A comparação aceita apenas nomes presentes no histórico atual. Uma cidade consultada novamente retorna ao topo; cidades substituídas após a quinta consulta deixam de estar disponíveis para comparação.

## Respostas de erro

- `400`: cidade ausente/inválida ou comparação sem duas cidades previamente consultadas.
- `404`: cidade não localizada ou rota inexistente.
- `502`: Open-Meteo indisponível ou timeout.
- `500`: erro interno de leitura/comparação do histórico.
