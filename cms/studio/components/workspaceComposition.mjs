export function composeWorkspaceSections(sections, order) {
  const byId = new Map()
  for (const section of sections) {
    if (byId.has(section.id)) throw new Error(`Duplicate Studio workspace slot: ${section.id}`)
    byId.set(section.id, section)
  }
  const unexpected = [...byId.keys()].filter((id) => !order.includes(id))
  const missing = order.filter((id) => !byId.has(id))
  if (unexpected.length || missing.length) {
    throw new Error(
      `Invalid Studio workspace composition. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
    )
  }
  return order.map((id) => byId.get(id))
}
