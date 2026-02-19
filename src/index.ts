import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchPackages,
  getPackageInfo,
  getDownloads,
  compareDownloads,
  getBundleSize,
  getVulnerabilities,
  getDependencyTree,
  getDownloadTrends,
} from "./npm-api.js";

const server = new McpServer({
  name: "mcp-server-npm-plus",
  version: "1.0.0",
});

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

server.tool(
  "search",
  "Search npm packages by query. Returns name, version, description, and keywords.",
  {
    query: z.string().describe("Search query (e.g. 'react state management')"),
    size: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Number of results (default 10)"),
  },
  async ({ query, size }) => {
    try {
      const results = await searchPackages(query, size);
      if (results.length === 0) {
        return { content: [{ type: "text", text: "No packages found." }] };
      }
      const text = results
        .map(
          (r, i) =>
            `${i + 1}. **${r.name}** v${r.version}\n   ${r.description || "(no description)"}\n   Keywords: ${r.keywords.join(", ") || "—"}`,
        )
        .join("\n\n");
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "package_info",
  "Get detailed info about an npm package: description, license, repo, dependencies.",
  {
    name: z.string().describe("Package name (e.g. 'express')"),
  },
  async ({ name }) => {
    try {
      const info = await getPackageInfo(name);
      const depList = Object.entries(info.dependencies)
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n");
      const devDepList = Object.entries(info.devDependencies)
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n");

      const text = [
        `# ${info.name} v${info.version}`,
        "",
        info.description,
        "",
        "| Field | Value |",
        "|-------|-------|",
        `| License | ${info.license} |`,
        `| Homepage | ${info.homepage || "—"} |`,
        `| Repository | ${info.repository || "—"} |`,
        `| Dependencies | ${Object.keys(info.dependencies).length} |`,
        `| Dev dependencies | ${Object.keys(info.devDependencies).length} |`,
        "",
        "**Keywords:** " + (info.keywords.join(", ") || "—"),
        "",
        depList ? "**Dependencies:**\n" + depList : "",
        devDepList ? "\n**Dev dependencies:**\n" + devDepList : "",
      ]
        .filter(Boolean)
        .join("\n");

      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "downloads",
  "Get download statistics for an npm package.",
  {
    name: z.string().describe("Package name"),
    period: z
      .string()
      .default("last-month")
      .describe("Period: last-day, last-week, last-month, last-year"),
  },
  async ({ name, period }) => {
    try {
      const stats = await getDownloads(name, period);
      const text = [
        `# ${stats.package} downloads`,
        "",
        `Period: ${stats.start} to ${stats.end}`,
        `Total: **${stats.downloads.toLocaleString()}** downloads`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "compare_downloads",
  "Compare download counts across multiple packages.",
  {
    packages: z
      .array(z.string())
      .min(2)
      .max(10)
      .describe("Package names to compare"),
    period: z
      .string()
      .default("last-month")
      .describe("Period: last-day, last-week, last-month, last-year"),
  },
  async ({ packages, period }) => {
    try {
      const results = await compareDownloads(packages, period);
      const sorted = [...results].sort((a, b) => b.downloads - a.downloads);

      const header = "| Package | Downloads |";
      const sep = "|---------|-----------|";
      const rows = sorted
        .map((r) => `| ${r.package} | ${r.downloads.toLocaleString()} |`)
        .join("\n");

      const text = [
        `## Download comparison (${period})`,
        "",
        `Period: ${results[0]?.start ?? "—"} to ${results[0]?.end ?? "—"}`,
        "",
        header,
        sep,
        rows,
      ].join("\n");

      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "bundle_size",
  "Get bundle size (minified + gzip) for an npm package via Bundlephobia.",
  {
    name: z
      .string()
      .describe("Package name (e.g. 'lodash' or 'lodash@4.17.21')"),
  },
  async ({ name }) => {
    try {
      const size = await getBundleSize(name);
      const text = [
        `# ${size.name}@${size.version} bundle size`,
        "",
        "| Metric | Size |",
        "|--------|------|",
        `| Minified | ${formatSize(size.size)} |`,
        `| Gzipped | ${formatSize(size.gzip)} |`,
        `| Dependencies | ${size.dependencyCount} |`,
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "vulnerabilities",
  "Get vulnerability info for an npm package. Note: Full audit requires npm audit in project context.",
  {
    name: z.string().describe("Package name"),
  },
  async ({ name }) => {
    try {
      const text = await getVulnerabilities(name);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "dependency_tree",
  "Get dependency tree for an npm package (direct deps only).",
  {
    name: z.string().describe("Package name"),
  },
  async ({ name }) => {
    try {
      const text = await getDependencyTree(name);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "download_trends",
  "Get download trends (daily breakdown + sparkline) for an npm package.",
  {
    name: z.string().describe("Package name"),
    period: z
      .string()
      .default("last-month")
      .describe("Period: last-day, last-week, last-month, last-year"),
  },
  async ({ name, period }) => {
    try {
      const text = await getDownloadTrends(name, period);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
