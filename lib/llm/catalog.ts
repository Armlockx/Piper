export type CatalogModel = {
  id: string;
  name: string;
  family: string;
};

export class CatalogError extends Error {
  readonly httpStatus: 400 | 404 | 502;

  constructor(message: string, httpStatus: 400 | 404 | 502) {
    super(message);
    this.name = "CatalogError";
    this.httpStatus = httpStatus;
  }
}

export function familyForModel(
  id: string,
  ownedBy: string | null | undefined,
  providerSlug: string
): string {
  const slash = id.indexOf("/");
  if (slash > 0) return id.slice(0, slash).toLowerCase();
  const owner = ownedBy?.trim();
  if (owner) return owner.toLowerCase();
  return providerSlug.toLowerCase();
}

export function toCatalogModels(payload: unknown, providerSlug: string): CatalogModel[] {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new CatalogError("unexpected models payload", 502);
  }
  const data = (payload as { data: unknown }).data;
  if (!Array.isArray(data)) {
    throw new CatalogError("unexpected models payload", 502);
  }
  return data.map((row) => {
    const rec = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const id = typeof rec.id === "string" ? rec.id : "";
    const name = typeof rec.name === "string" && rec.name.trim() ? rec.name : id;
    const ownedBy = typeof rec.owned_by === "string" ? rec.owned_by : null;
    return { id, name, family: familyForModel(id, ownedBy, providerSlug) };
  });
}

export function groupCatalogModels(
  models: CatalogModel[]
): { family: string; models: CatalogModel[] }[] {
  const map = new Map<string, CatalogModel[]>();
  for (const model of models) {
    const list = map.get(model.family) ?? [];
    list.push(model);
    map.set(model.family, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([family, grouped]) => ({ family, models: grouped }));
}
