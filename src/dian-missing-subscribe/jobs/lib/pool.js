// 聚合订阅池读写。
export async function listPool(ctx, mediaType = 'tv', pageSize = 200) {
  const out = []
  let offset = 0
  for (let page = 0; page < 10; page += 1) {
    const res = await ctx.api.get(`/api/subscribe/pool/intents?media_type=${mediaType}&limit=${pageSize}&offset=${offset}`)
    const data = Array.isArray(res && res.data) ? res.data : []
    out.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }
  return out
}

export async function createIntent(ctx, payload) {
  const res = await ctx.api.post('/api/subscribe/pool/intents', payload)
  return (res && res.data) || null
}

export async function patchEpisodes(ctx, id, payload) {
  const res = await ctx.api.patch(`/api/subscribe/pool/intents/${encodeURIComponent(id)}/episodes`, payload)
  return (res && res.data) || null
}

export async function deleteIntent(ctx, id) {
  return ctx.api.delete(`/api/subscribe/pool/intents/${encodeURIComponent(id)}`)
}

export async function getIntent(ctx, id) {
  const res = await ctx.api.get(`/api/subscribe/pool/intents/${encodeURIComponent(id)}`)
  return (res && res.data) || null
}
