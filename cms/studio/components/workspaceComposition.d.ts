export function composeWorkspaceSections<T extends {id: string}>(
  sections: readonly T[],
  order: readonly string[],
): T[]
