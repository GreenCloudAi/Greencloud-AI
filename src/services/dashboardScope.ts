const providers = ["aws", "gcp", "azure"] as const;
type Provider = (typeof providers)[number];

export function parseDashboardScope(params: URLSearchParams) {
  const rawIds = params.get("accountIds") ?? params.get("accountId");
  const accountIds = rawIds === null || rawIds === "all"
    ? null
    : new Set(rawIds.split(",").map((id) => id.trim()).filter(Boolean));
  const rawProviders = params.get("providers");
  const requestedProviders = rawProviders === null || rawProviders === "all"
    ? providers
    : rawProviders.split(",").map((value) => value.trim().toLowerCase());
  const providerSet = new Set<Provider>(providers.filter((provider) =>
    (requestedProviders as readonly string[]).includes(provider)
  ));
  const window = params.get("window");
  const label = window === "7d" || window === "90d" ? window : "30d";
  return { accountIds, providerSet, label, days: parseInt(label, 10) };
}
