export type HierarchyTask = {
  id: number;
  parentId?: number | null;
};

export type TaskHierarchyRow<T extends HierarchyTask> = {
  item: T;
  depth: number;
  hasChildren: boolean;
};

/**
 * Ordena tareas para que cada subtarea aparezca junto a su padre.
 * Referencias huérfanas se mantienen como tareas raíz y los ciclos no bloquean el render.
 */
export function orderTasksWithHierarchy<T extends HierarchyTask>(items: T[]): TaskHierarchyRow<T>[] {
  const knownIds = new Set(items.map((item) => item.id));
  const children = new Map<number, T[]>();
  const roots: T[] = [];

  for (const item of items) {
    const parentId = item.parentId;
    if (typeof parentId !== 'number' || parentId === item.id || !knownIds.has(parentId)) {
      roots.push(item);
      continue;
    }
    const siblings = children.get(parentId) ?? [];
    siblings.push(item);
    children.set(parentId, siblings);
  }

  const rows: TaskHierarchyRow<T>[] = [];
  const visited = new Set<number>();
  const visit = (item: T, depth: number) => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    const descendants = children.get(item.id) ?? [];
    rows.push({ item, depth, hasChildren: descendants.length > 0 });
    for (const child of descendants) visit(child, depth + 1);
  };

  for (const root of roots) visit(root, 0);
  // A cycle has no root; keep its records visible instead of dropping them.
  for (const item of items) visit(item, 0);
  return rows;
}
