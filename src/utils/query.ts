// escape user input before putting it in a regex
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function searchFilter(search: string | undefined, fields: string[]) {
  if (!search) return {};
  const rx = new RegExp(escapeRegex(search), 'i');
  return { $or: fields.map((f) => ({ [f]: rx })) };
}

// to is inclusive, so push it to end of day (UTC)
export function dateRangeFilter(field: string, from?: string, to?: string) {
  if (!from && !to) return {};
  const range: { $gte?: Date; $lte?: Date } = {};
  if (from) range.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999Z`);
  return { [field]: range };
}

export function paginate(page: number, limit: number) {
  return { skip: (page - 1) * limit, limit };
}

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// _id as tie breaker so paging is stable
export function parseSort(sort: string): Record<string, 1 | -1> {
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return { [field]: desc ? -1 : 1, _id: desc ? -1 : 1 };
}
