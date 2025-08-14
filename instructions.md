# Instructions - TikTok Shop BR Actor

## Visão Geral do Projeto

Este projeto é um **Apify Actor especializado em scraping do TikTok Shop** com foco no mercado brasileiro. O ator utiliza proxy residencial brasileiro, filtra produtos com sinais do Brasil e mapeia os dados para o schema da tabela `products` do Supabase.

## Características Principais

### 🇧🇷 Foco no Brasil
- **Proxy residencial brasileiro obrigatório** para todas as requisições
- **Filtragem por sinais brasileiros**: moeda BRL, regiões de armazém BR, URLs .br
- **Normalização de dados** para o mercado brasileiro

### 🏗️ Arquitetura
- **TypeScript** com ES2020+
- **pnpm** como gerenciador de pacotes
- **Apify SDK** para scraping e proxy
- **Playwright** para automação de browser
- **Vitest** para testes unitários
- **ESLint + Prettier** para qualidade de código

### 📊 Integração Supabase
- Mapeamento direto para o schema da tabela `products`
- Suporte a upsert com `on_conflict=platform_id`
- Workflow n8n pronto para uso

## Estrutura do Projeto

```
/
├─ src/
│  ├─ main.ts               # Entry point do Actor
│  ├─ lib/
│  │  ├─ tiktok.ts         # Lógica de scraping
│  │  ├─ filters.ts        # Filtros por região/moeda
│  │  ├─ mapping.ts        # Mapeamento Supabase
│  │  └─ utils.ts          # Funções auxiliares
├─ n8n/
│  └─ tiktok_to_supabase.json # Workflow n8n
├─ .github/workflows/
│  └─ ci.yml               # GitHub Actions
├─ input_schema.json       # Schema de entrada
├─ apify.json             # Metadados do Actor
├─ package.json           # Dependências
├─ tsconfig.json          # Config TypeScript
├─ vitest.config.ts       # Config de testes
├─ Dockerfile             # Container Apify
├─ README.md              # Documentação completa
└─ LICENSE                # MIT License
```

## Como Usar

### 1. Configuração Local

```bash
# Instalar dependências
pnpm install

# Configurar ambiente
cp .env.example .env
# Editar .env com seu APIFY_TOKEN

# Executar o actor
pnpm start
```

### 2. Input de Exemplo

```json
{
  "region": "BR",
  "limit": 20,
  "keyword": "smartphone",
  "requireBrazilSignals": true,
  "dropIfNoImage": true,
  "minPrice": 100,
  "maxPrice": 1000
}
```

### 3. Saída Esperada

Cada item do dataset contém:
- `raw`: dados brutos do TikTok Shop
- `mapped`: dados mapeados para Supabase

## Integração n8n

### Passos de Configuração

1. **Importar workflow**: `n8n/tiktok_to_supabase.json`
2. **Configurar variáveis** no nó "Set Config":
   - `APIFY_TOKEN`: Token da API Apify
   - `ACTOR_ID`: ID do seu actor publicado
   - `SUPABASE_URL`: URL do projeto Supabase
   - `SUPABASE_KEY`: Chave service_role do Supabase
   - `SUPABASE_TABLE`: `products`

### Fluxo do Workflow

1. **Set Config** → Define variáveis
2. **Start Actor** → Executa o actor via API
3. **Get Dataset Items** → Busca resultados
4. **Map to Supabase** → Extrai dados mapeados
5. **Supabase Upsert** → Insere/atualiza no banco

## Desenvolvimento

### Comandos Disponíveis

```bash
# Desenvolvimento
pnpm dev          # Build com watch
pnpm build        # Build para produção
pnpm start        # Executar actor

# Qualidade de código
pnpm lint         # Verificar código
pnpm lint:fix     # Corrigir automaticamente
pnpm format       # Formatar código
pnpm type-check   # Verificar tipos

# Testes
pnpm test         # Testes em modo watch
pnpm test:run     # Executar testes uma vez
```

### Testes Implementados

- **utils.test.ts**: Parsing de preços, URLs de imagem, detecção de moeda
- **filters.test.ts**: Filtragem por sinais brasileiros, preços, imagens
- **mapping.test.ts**: Mapeamento correto para schema Supabase

## Proxy Brasileiro - Por Que É Crítico

### Benefícios do Proxy BR
1. **Resultados autênticos**: TikTok Shop mostra produtos diferentes por região
2. **Menos captcha**: IPs brasileiros são menos suspeitos para conteúdo BR
3. **Moeda e estoque corretos**: Garante preços em BRL e estoque brasileiro
4. **Compliance regional**: Respeita a geo-segmentação do TikTok

### Implementação
```typescript
const proxyConfiguration = await Actor.createProxyConfiguration({
  groups: ['RESIDENTIAL'],
  countryCode: 'BR',
});
```

## Filtragem de Sinais Brasileiros

### Critérios de Detecção
- **Moeda**: `BRL`, `R$` no currency ou format_price
- **Região**: Estados brasileiros no warehouse_region
- **URLs**: Domínios `.br` ou paths `/br-` nos schemas

### Configuração
```json
{
  "requireBrazilSignals": true  // Filtra itens sem sinais BR
}
```

## Mapeamento Supabase

### Campos Mapeados

| Campo Supabase | Origem TikTok | Transformação |
|----------------|---------------|---------------|
| `title` | `title` | Direto |
| `image_url` | `cover` ou `img[0]` | Primeira imagem válida |
| `price` | `floor_price` | Parse para número |
| `platform_id` | `product_id_str` | ID único |
| `currency` | `currency` | Normalizado para BRL |
| `trending_score` | Calculado | `(vendas*0.6 + rating*0.4)` |

## Segurança

### Boas Práticas
- ✅ Nunca commitar tokens no código
- ✅ Usar `.env` para desenvolvimento
- ✅ Service role key apenas em ambiente seguro
- ✅ Configurar RLS no Supabase
- ✅ Audit de dependências no CI

### Variáveis de Ambiente
```env
APIFY_TOKEN=your_token_here
APIFY_PROXY_GROUPS=RESIDENTIAL
APIFY_PROXY_COUNTRY_CODE=BR
```

## Limitações e Dicas

### Problemas Comuns
- **Captcha**: Proxy BR reduz, mas pode ocorrer
- **Rate limit**: Ajustar `maxConcurrency`
- **Sem resultados**: Testar com `requireBrazilSignals: false`

### Otimizações
- Começar com `limit` pequeno para testes
- Usar `debug: true` para entender filtragem
- Monitorar logs de estatísticas de filtros

## Deploy e Publicação

### No Apify Console
1. Fazer upload do código
2. Configurar input schema
3. Testar com dados reais
4. Publicar como ator público/privado

### CI/CD
- GitHub Actions configurado
- Testes automáticos em Node 18 e 20
- Lint e type checking
- Audit de segurança

## Suporte e Manutenção

### Monitoramento
- Logs detalhados de filtragem
- Estatísticas de conversão (raw → filtered → mapped)
- Alertas para falhas de proxy

### Atualizações
- Monitorar mudanças na UI do TikTok Shop
- Atualizar seletores se necessário
- Manter compatibilidade com schema Supabase

## Licença

MIT License - Uso livre para projetos comerciais e pessoais.

---

**Desenvolvido para pesquisa de mercado e inteligência de negócios. Respeite os termos de serviço do TikTok Shop.**
