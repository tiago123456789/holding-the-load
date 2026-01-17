# Holding The Load

[Versão em Inglês](README.md)

Uma maneira simples e inteligente de gerenciar períodos de pico para seus aplicativos web, construída no Cloudflare. Ela protege seu servidor de ficar sobrecarregado por muitas solicitações ao mesmo tempo, como um controlador de congestionamento para a internet.

Este projeto ajuda a manter seu servidor acessível (VPS) seguro contra picos repentinos de solicitações de webhook, evitando travamentos e mantendo tudo funcionando suavemente.

## Quando Você Deve Usá-lo?

- **Ferramentas de Automação**: Como N8N ou similares, onde você precisa lidar com eventos de outros serviços.
- **Fluxos de Trabalho Auto-Hospedados**: Para motores que reagem a eventos de webhook.
- **APIs**: Qualquer aplicativo que recebe notificações ou envios de dados.
- **Agentes de IA**: Bots ou assistentes que respondem a eventos via webhooks.

## Por Que Usá-lo? Benefícios

- **Lida com Períodos de Pico**: Picos de webhook são gerenciados antes de chegarem ao seu servidor, mantendo-o estável.
- **Carga de Trabalho Previsível**: Seu servidor funciona suavemente sem surpresas.
- **Economize Dinheiro**: Não há necessidade de pagar por energia extra o tempo todo—apenas quando necessário.
- **Sem Perda de Dados**: Mesmo se seu servidor cair temporariamente, os webhooks são armazenados com segurança e não são perdidos.

## Obter Ajuda

Preso configurando isso? Ou tendo problemas com seu aplicativo?

Envie-me um e-mail: [tiagorosadacost@gmail.com](mailto:tiagorosadacost@gmail.com)

## Índice

- [O Que É Isso?](#o-que-é-isso-)
- [Quando Usá-lo](#quando-você-deve-usá-lo-)
- [Benefícios](#por-que-usá-lo-benefícios-)
- [Recursos Principais](#recursos-principais-)
- [Estimativa de Custo](#estimativa-de-custo-)
- [Tecnologia Por Trás](#tecnologia-por-trás-)
- [Começando](#começando-)
- [Configurações](#configurações-)
- [Limites do Plano Gratuito](#limites-do-plano-gratuito-)
- [Como Funciona](#como-funciona-)
- [Exemplos](#exemplos-)
- [Testes](#testes-)
- [Obter Ajuda](#obter-ajuda-)

## O Que É Isso?

Esta ferramenta usa a poderosa infraestrutura do Cloudflare (como workers inteligentes e armazenamento confiável) para lidar com corridas repentinas de solicitações. Você pode processá-las uma de cada vez ou em pequenos grupos, no seu próprio ritmo.

## Quando Usá-lo

Imagine isso: Você está executando um aplicativo em um servidor de orçamento que não é super poderoso—porque os poderosos custam mais. À medida que seu aplicativo ou chatbot fica popular, ele começa a receber toneladas de solicitações o dia todo, sobrecarregando o servidor. Você tem que atualizar para um servidor maior e mais caro, e se ficar ainda mais ocupado, você atualiza novamente... e novamente.

**Holding The Load** resolve isso! O Cloudflare cuida dos períodos de pico e do tráfego inesperado, enquanto você puxa solicitações em um ritmo que corresponde à força do seu servidor.

## Recursos Principais

- **Enfileiramento Inteligente**: Alinha solicitações recebidas durante períodos de pico para que nada seja perdido.
- **Processamento Flexível**: Puxe solicitações uma por uma ou em lotes (como 10 de cada vez).
- **Organização em Grupos**: Separe webhooks por aplicativo ou tarefa. (Para adicionar seus próprios grupos, edite o arquivo `groups.json` na raiz do projeto.)
- **Armazenamento Confiável**: Usa armazenamento avançado para manter os dados seguros.
- **Amigável ao Orçamento**: Custo baixo para lidar com explosões de tráfego.
- **Prevenção de Duplicatas**: Impede que a mesma solicitação seja processada duas vezes.
- **Verificação de Dados**: Valida solicitações recebidas com base nas configurações do seu grupo.

### Configurando Grupos

1. Abra o arquivo `groups.json`.
2. Adicione um novo nome à lista. (Use nomes simples sem caracteres especiais, como `user_queue`, `product_updates`, `chatbot_support`.)

### Configurando Validação de Dados

1. Pegue a estrutura JSON que você espera para seus dados.
2. Vá para [este site](https://transform.tools/json-to-zod) e cole seu JSON.
3. Ele criará um snippet de código simples.
4. Copie a parte que parece `z.object({...})`.
5. Abra `src/schemas-validation.ts` e adicione o nome do seu grupo como uma chave, com o código copiado como o valor.
6. Agora, quando webhooks chegarem para esse grupo, eles serão verificados automaticamente.

## Estimativa de Custo

**Exemplo**: 10 milhões de solicitações por mês, usando os serviços do Cloudflare.

### Detalhamento

| Parte                         | Detalhes                                | Custo Mensal |
| ----------------------------- | --------------------------------------- | ------------ |
| Plano Básico                  | Plano Pago do Cloudflare Workers        | $5.00        |
| Solicitações                  | 10M (incluído)                          | $0.00        |
| Tempo de Processamento        | Tempo extra além do gratuito            | $0.80        |
| Solicitações de Armazenamento | 10M                                     | $0.50        |
| Gravações de Armazenamento    | 500k (incluído)                         | $0.00        |
| Leituras de Armazenamento     | Com base na sua configuração (incluído) | $0.00        |
| **Total**                     |                                         | **$6.30**    |

## Tecnologia Por Trás

- Cloudflare Workers (lida com o trabalho pesado)
- Durable Objects com SQLite (armazenamento seguro de dados)
- Node.js (v21.0.0) e TypeScript (para codificação)

## Começando

1. **Baixe o Projeto**: Clone-o para seu computador.
2. **Configure a Segurança**: Adicione sua `API_KEY` em `wrangler.jsonc`.
3. **Teste Localmente**: Execute `npm run dev` para testá-lo em sua máquina.
4. **Vá Ao Vivo**: Execute `npm run deploy` para colocá-lo no Cloudflare (precisa do Wrangler CLI).
5. **Teste as Rotas**: Importe `Insomnia_2026-01-12.yaml` para o Insomnia para testar.
6. **Mantenha Saudável**: Configure um cronograma para chamar `/health` a cada minuto para salvar dados com segurança.

## Configurações

- `API_KEY`: Uma chave secreta para proteger seu aplicativo—apenas aplicativos autorizados podem enviar solicitações.

## Limites do Plano Gratuito

O plano gratuito tem alguns limites:

- 100.000 solicitações por dia
- 128MB de memória de armazenamento
- 1.000 solicitações por minuto
- 100.000 gravações de dados por dia

### Precisa de Mais?

Atualize para o plano de $5 para mais poder. Verifique [Preços do Cloudflare](https://developers.cloudflare.com/workers/platform/pricing/).

## Como Funciona

![Arquitetura](./architecture.png)

## Exemplos

### Enviando um Webhook

```
Solicitação:
curl --request POST \
  --url http://localhost:8787/new-events \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: your_api_key' \
  --data '{
    "message": "Olá do usuário 123",
    "timestamp": "1751872147530"
  }'

Resposta:
{
    "ok": true
}
```

### Obtendo Webhooks para Processar

```
Solicitação:
curl --request GET \
  --url 'http://localhost:8787/pull-events?total=1' \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: your_api_key'

Resposta (com dados):
[
    {
        "id": "unique-id-here",
        "requestBody": {
            "message": "Olá do usuário 456",
            "timestamp": "1793123847723"
        },
        "retries": 0
    }
]

Resposta (nada para processar):
[]
```

## Testes

Testamos com 5.000 solicitações de 600 usuários falsos usando uma ferramenta chamada autocannon. Aqui estão os resultados:

### Sem Salvamento Extra

```
┌─────────┬────────┬────────┬─────────┬─────────┬───────────┬──────────┬─────────┐
│ Estatística │ 2.5%   │ 50%    │ 97.5%   │ 99%     │ Média     │ Desvio Padrão │ Máximo │
├─────────┼────────┼─────────┼─────────┼─────────┼───────────┼──────────┼─────────┤
│ Latência │ 150 ms │ 214 ms │ 1941 ms │ 2002 ms │ 434.97 ms │ 497.2 ms │ 2345 ms │
└─────────┴────────┴────────┴─────────┴─────────┴───────────┴──────────┴─────────┘
┌───────────┬─────┬──────┬────────┬─────────┬────────┬────────┬────────┐
│ Estatística │ 1%  │ 2.5% │ 50%    │ 97.5%   │ Média  │ Desvio Padrão │ Mínimo │
├───────────┼─────┼──────┼────────┼─────────┼────────┼────────┼────────┤
│ Req/Sec   │ 0   │ 0    │ 821    │ 2,307   │ 1,250  │ 901.49 │ 821    │
├───────────┼─────┼──────┼────────┼─────────┼────────┼────────┼────────┤
│ Bytes/Sec │ 0 B │ 0 B  │ 505 kB │ 1.42 MB │ 769 kB │ 555 kB │ 505 kB │
└───────────┴─────┴──────┴────────┴────────┴────────┴────────┴────────┘
```
