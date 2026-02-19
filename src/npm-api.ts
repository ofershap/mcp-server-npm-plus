const REGISTRY = "https://registry.npmjs.org";
const API = "https://api.npmjs.org";
const BUNDLEPHOBIA = "https://bundlephobia.com/api/size";

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  license: string;
  homepage: string;
  repository: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface SearchResult {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  downloads: number;
}

export interface BundleSize {
  name: string;
  version: string;
  size: number;
  gzip: number;
  dependencyCount: number;
}

export interface DownloadStats {
  package: string;
  downloads: number;
  start: string;
  end: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error (${response.status}): ${text}`);
  }
  return (await response.json()) as T;
}

export async function searchPackages(
  query: string,
  size = 10,
): Promise<SearchResult[]> {
  const data = await fetchJson<{
    objects: {
      package: {
        name: string;
        version: string;
        description: string;
        keywords: string[];
      };
      searchScore?: number;
    }[];
  }>(`${REGISTRY}/-/v1/search?text=${encodeURIComponent(query)}&size=${size}`);

  return data.objects.map((obj) => ({
    name: obj.package.name,
    version: obj.package.version,
    description: obj.package.description ?? "",
    keywords: obj.package.keywords ?? [],
    downloads: 0, // npm search API does not include downloads
  }));
}

export async function getPackageInfo(name: string): Promise<PackageInfo> {
  const data = await fetchJson<{
    name: string;
    "dist-tags": Record<string, string>;
    versions: Record<string, unknown>;
    description?: string;
    license?: string;
    homepage?: string;
    repository?: { url?: string } | string;
    keywords?: string[];
  }>(`${REGISTRY}/${encodeURIComponent(name)}`);

  const latestVersion = data["dist-tags"]?.["latest"] ?? "";
  const latestData = (data.versions?.[latestVersion] ?? {}) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const repoUrl =
    typeof data.repository === "string"
      ? data.repository
      : ((data.repository as { url?: string })?.url ?? "");

  return {
    name: data.name,
    version: latestVersion,
    description: data.description ?? "",
    license: data.license ?? "Unknown",
    homepage: data.homepage ?? "",
    repository: String(repoUrl)
      .replace(/^git\+/, "")
      .replace(/\.git$/, ""),
    keywords: data.keywords ?? [],
    dependencies: latestData.dependencies ?? {},
    devDependencies: latestData.devDependencies ?? {},
  };
}

export async function getDownloads(
  name: string,
  period = "last-month",
): Promise<DownloadStats> {
  const data = await fetchJson<{
    package?: string;
    downloads: number;
    start: string;
    end: string;
  }>(`${API}/downloads/point/${period}/${encodeURIComponent(name)}`);

  return {
    package: data.package ?? name,
    downloads: data.downloads,
    start: data.start,
    end: data.end,
  };
}

export async function compareDownloads(
  packages: string[],
  period = "last-month",
): Promise<DownloadStats[]> {
  const results = await Promise.all(
    packages.map((pkg) => getDownloads(pkg, period)),
  );
  return results;
}

export async function getBundleSize(name: string): Promise<BundleSize> {
  const pkgSpec = name.includes("@") ? name : `${name}@latest`;
  const data = await fetchJson<{
    name?: string;
    version?: string;
    size?: number;
    gzip?: number;
    dependencyCount?: number;
  }>(`${BUNDLEPHOBIA}?package=${encodeURIComponent(pkgSpec)}`);

  return {
    name: data.name ?? name.split("@")[0] ?? name,
    version: data.version ?? "latest",
    size: data.size ?? 0,
    gzip: data.gzip ?? 0,
    dependencyCount: data.dependencyCount ?? 0,
  };
}

export async function getVulnerabilities(name: string): Promise<string> {
  // npm audit API requires POST with lockfile; no public GET for package advisories.
  // Use GitHub Advisory API or return instructional message.
  try {
    const info = await getPackageInfo(name);
    const advisoryUrl = `https://github.com/advisories?query=${encodeURIComponent(info.name)}`;
    return `Vulnerability data for "${name}" requires \`npm audit\` in a project that uses it.\n\nPublic APIs: Run \`npm audit\` in your project, or check advisories at:\n${advisoryUrl}\n\nFor automated scanning, consider Snyk or Dependabot.`;
  } catch (err) {
    throw new Error(
      `Could not fetch package info for vulnerability check: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function getDependencyTree(name: string): Promise<string> {
  const info = await getPackageInfo(name);
  const depEntries = Object.entries(info.dependencies);
  const devDepEntries = Object.entries(info.devDependencies);

  const lines: string[] = [`${info.name}@${info.version}`, ""];

  if (depEntries.length > 0) {
    lines.push("dependencies:");
    for (const [dep, version] of depEntries) {
      lines.push(`├── ${dep}@${version}`);
    }
  }
  if (devDepEntries.length > 0) {
    lines.push("");
    lines.push("devDependencies:");
    for (const [dep, version] of devDepEntries) {
      lines.push(`├── ${dep}@${version}`);
    }
  }
  if (depEntries.length === 0 && devDepEntries.length === 0) {
    lines.push("(no dependencies)");
  }

  return lines.join("\n");
}

export async function getDownloadTrends(
  name: string,
  period = "last-month",
): Promise<string> {
  const data = await fetchJson<{
    downloads: { day: string; downloads: number }[];
    start: string;
    end: string;
    package?: string;
  }>(`${API}/downloads/range/${period}/${encodeURIComponent(name)}`);

  const daily = data.downloads ?? [];
  const total = daily.reduce((sum, d) => sum + d.downloads, 0);
  const avg = daily.length > 0 ? Math.round(total / daily.length) : 0;
  const max = daily.length > 0 ? Math.max(...daily.map((d) => d.downloads)) : 0;
  const min = daily.length > 0 ? Math.min(...daily.map((d) => d.downloads)) : 0;

  // Simple sparkline: use block chars ▁▂▃▄▅▆▇█
  const blocks = "▁▂▃▄▅▆▇█";
  let sparkline = "";
  if (daily.length > 0 && max > 0) {
    sparkline = daily
      .map((d) => {
        const idx = Math.min(
          Math.floor((d.downloads / max) * (blocks.length - 1)),
          blocks.length - 1,
        );
        return blocks[idx];
      })
      .join("");
  }

  const tableRows = daily
    .slice(-14) // last 2 weeks
    .map((d) => `| ${d.day} | ${d.downloads.toLocaleString()} |`)
    .join("\n");

  return [
    `## ${data.package ?? name} — ${data.start} to ${data.end}`,
    "",
    `Total: ${total.toLocaleString()} | Avg/day: ${avg.toLocaleString()} | Min: ${min.toLocaleString()} | Max: ${max.toLocaleString()}`,
    "",
    sparkline ? `Trend: ${sparkline}` : "",
    sparkline ? "" : "",
    "| Day | Downloads |",
    "|-----|-----------|",
    tableRows,
  ]
    .filter(Boolean)
    .join("\n");
}
