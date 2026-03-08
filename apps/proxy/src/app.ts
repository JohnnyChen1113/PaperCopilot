import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamText } from 'hono/streaming'
import { z } from 'zod'

export const app = new Hono()

app.use('*', cors())

const modelsSchema = z.object({
  provider: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
})

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).min(1),
  systemPrompt: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
})

const titleSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  model: z.string().min(1),
})

function extractDeltaContent(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const choices = Reflect.get(payload, 'choices')
  if (!Array.isArray(choices) || choices.length === 0) {
    return ''
  }

  const delta = Reflect.get(choices[0], 'delta')
  if (!delta || typeof delta !== 'object') {
    return ''
  }

  const content = Reflect.get(delta, 'content')

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== 'object') {
          return ''
        }

        const text = Reflect.get(part, 'text')
        return typeof text === 'string' ? text : ''
      })
      .join('')
  }

  return ''
}

function buildApiUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, '')

  if (normalizedBase.endsWith('/v1')) {
    return `${normalizedBase}${path}`
  }

  return `${normalizedBase}/v1${path}`
}

function getModelsUrl(input: z.infer<typeof modelsSchema>) {
  const url = new URL(buildApiUrl(input.baseUrl, '/models'))

  if (input.provider === 'siliconflow') {
    url.searchParams.set('type', 'text')
    url.searchParams.set('sub_type', 'chat')
  }

  return url.toString()
}

function isMiniMaxBaseUrl(baseUrl: string) {
  return /api\.minimax(i|\.io)/.test(baseUrl)
}

function getMiniMaxFallbackModels() {
  return [
    'MiniMax-M2.5',
    'MiniMax-M2.5-highspeed',
    'MiniMax-M2.1',
    'MiniMax-M2.1-highspeed',
    'MiniMax-M2',
  ]
}

app.get('/', (c) => {
  return c.text('PaperCopilot Proxy Running')
})

app.post('/models', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = modelsSchema.safeParse(json)

  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid model request',
        details: parsed.error.flatten(),
      },
      400,
    )
  }

  const input = parsed.data
  const upstream = await fetch(getModelsUrl(input), {
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown upstream error'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  if (!upstream.ok) {
    if (upstream.status === 404 && (input.provider === 'minimax' || isMiniMaxBaseUrl(input.baseUrl))) {
      return c.json({ models: getMiniMaxFallbackModels(), source: 'fallback' })
    }

    const errorText = await upstream.text()
    return new Response(
      JSON.stringify({
        error: 'Provider model request failed',
        details: errorText || upstream.statusText,
        status: upstream.status,
      }),
      {
        status: upstream.status >= 400 ? upstream.status : 502,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  const payload = (await upstream.json().catch(() => null)) as {
    data?: Array<{ id?: string }>
  } | null

  const models = Array.from(
    new Set(
      (payload?.data ?? [])
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id))
        .sort((left, right) => left.localeCompare(right)),
    ),
  )

  return c.json({ models })
})

app.post('/chat', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = chatSchema.safeParse(json)

  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid chat request',
        details: parsed.error.flatten(),
      },
      400,
    )
  }

  const input = parsed.data
  const upstream = await fetch(buildApiUrl(input.baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: input.model,
      stream: true,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      messages: [
        { role: 'system', content: input.systemPrompt },
        ...input.messages,
      ],
    }),
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown upstream error'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text()
    return new Response(
      JSON.stringify({
        error: 'Provider request failed',
        details: errorText || upstream.statusText,
        status: upstream.status,
      }),
      {
        status: upstream.status >= 400 ? upstream.status : 502,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  c.header('Content-Type', 'text/plain; charset=utf-8')
  c.header('Cache-Control', 'no-cache')

  return streamText(c, async (stream) => {
    const reader = upstream.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const event of events) {
          const lines = event
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)

          for (const line of lines) {
            if (!line.startsWith('data:')) {
              continue
            }

            const data = line.slice(5).trim()

            if (!data || data === '[DONE]') {
              continue
            }

            let payload: unknown
            try {
              payload = JSON.parse(data)
            } catch {
              continue
            }
            const chunk = extractDeltaContent(payload)

            if (chunk) {
              await stream.write(chunk)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
      await stream.close()
    }
  })
})

app.post('/title', async (c) => {
  const json = await c.req.json().catch(() => null)
  const parsed = titleSchema.safeParse(json)

  if (!parsed.success) {
    return c.json(
      {
        error: 'Invalid title request',
        details: parsed.error.flatten(),
      },
      400,
    )
  }

  const input = parsed.data
  const upstream = await fetch(buildApiUrl(input.baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: input.model,
      stream: false,
      temperature: 0.2,
      max_tokens: 24,
      messages: [
        {
          role: 'system',
          content:
            '你要为一段学术论文阅读对话生成一个很短的中文标题。只输出标题本身，不要引号，不要句号，不要解释，长度控制在 6 到 18 个中文字符。',
        },
        {
          role: 'user',
          content: input.messages
            .map((message) => `${message.role === 'user' ? '用户' : '助手'}：${message.content}`)
            .join('\n\n'),
        },
      ],
    }),
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown upstream error'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  if (!upstream.ok) {
    const errorText = await upstream.text()
    return new Response(
      JSON.stringify({
        error: 'Provider title request failed',
        details: errorText || upstream.statusText,
        status: upstream.status,
      }),
      {
        status: upstream.status >= 400 ? upstream.status : 502,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  const payload = (await upstream.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> }
    | null

  const messageContent = payload?.choices?.[0]?.message?.content
  const title =
    typeof messageContent === 'string'
      ? messageContent
      : Array.isArray(messageContent)
        ? messageContent.map((part) => part.text ?? '').join('')
        : ''

  return c.json({
    title: title.replace(/["'“”‘’\n]/g, '').trim(),
  })
})
