import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchPackages,
  getPackageInfo,
  getDownloads,
  compareDownloads,
  getBundleSize,
  getVulnerabilities,
  getDependencyTree,
  getDownloadTrends,
} from "../src/npm-api.js";

describe("searchPackages", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns search results from npm registry", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        objects: [
          {
            package: {
              name: "lodash",
              version: "4.17.21",
              description: "Lodash modular utilities",
              keywords: ["modules", "stdlib", "util"],
            },
          },
        ],
      }),
    });

    const results = await searchPackages("lodash", 5);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "lodash",
      version: "4.17.21",
      description: "Lodash modular utilities",
      keywords: ["modules", "stdlib", "util"],
    });
    expect(results[0]?.downloads).toBe(0);
  });

  it("throws on API error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "Not found",
    });

    await expect(searchPackages("nonexistent")).rejects.toThrow(
      "API error (404)",
    );
  });
});

describe("getPackageInfo", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns package info with dependencies", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: "express",
        "dist-tags": { latest: "4.18.0" },
        description: "Fast web framework",
        license: "MIT",
        homepage: "https://expressjs.com",
        repository: { url: "git+https://github.com/expressjs/express.git" },
        keywords: ["web", "framework"],
        versions: {
          "4.18.0": {
            dependencies: { debug: "2.6.9" },
            devDependencies: { eslint: "8.0.0" },
          },
        },
      }),
    });

    const info = await getPackageInfo("express");
    expect(info.name).toBe("express");
    expect(info.version).toBe("4.18.0");
    expect(info.description).toBe("Fast web framework");
    expect(info.license).toBe("MIT");
    expect(info.dependencies).toEqual({ debug: "2.6.9" });
    expect(info.devDependencies).toEqual({ eslint: "8.0.0" });
    expect(info.repository).toContain("github.com");
  });
});

describe("getDownloads", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns download stats from point API", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        package: "lodash",
        downloads: 25000000,
        start: "2025-01-01",
        end: "2025-01-31",
      }),
    });

    const stats = await getDownloads("lodash", "last-month");
    expect(stats.package).toBe("lodash");
    expect(stats.downloads).toBe(25000000);
    expect(stats.start).toBe("2025-01-01");
    expect(stats.end).toBe("2025-01-31");
  });
});

describe("compareDownloads", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns download stats for multiple packages", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          package: "zustand",
          downloads: 5000000,
          start: "2025-01-01",
          end: "2025-01-31",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          package: "jotai",
          downloads: 2000000,
          start: "2025-01-01",
          end: "2025-01-31",
        }),
      });

    const results = await compareDownloads(["zustand", "jotai"]);
    expect(results).toHaveLength(2);
    expect(results[0]?.package).toBe("zustand");
    expect(results[0]?.downloads).toBe(5000000);
    expect(results[1]?.package).toBe("jotai");
    expect(results[1]?.downloads).toBe(2000000);
  });
});

describe("getBundleSize", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns bundle size from Bundlephobia", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: "lodash",
        version: "4.17.21",
        size: 71124,
        gzip: 24542,
        dependencyCount: 0,
      }),
    });

    const size = await getBundleSize("lodash");
    expect(size.name).toBe("lodash");
    expect(size.version).toBe("4.17.21");
    expect(size.size).toBe(71124);
    expect(size.gzip).toBe(24542);
    expect(size.dependencyCount).toBe(0);
  });
});

describe("getVulnerabilities", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns instructional message with package info", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: "express",
        "dist-tags": { latest: "4.18.0" },
        description: "Web framework",
        versions: { "4.18.0": {} },
      }),
    });

    const text = await getVulnerabilities("express");
    expect(text).toContain("express");
    expect(text).toContain("npm audit");
  });
});

describe("getDependencyTree", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns formatted tree with deps and devDeps", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: "next",
        "dist-tags": { latest: "14.0.0" },
        versions: {
          "14.0.0": {
            dependencies: { react: "18.0.0", "react-dom": "18.0.0" },
            devDependencies: { typescript: "5.0.0" },
          },
        },
      }),
    });

    const tree = await getDependencyTree("next");
    expect(tree).toContain("next@14.0.0");
    expect(tree).toContain("dependencies:");
    expect(tree).toContain("react@18.0.0");
    expect(tree).toContain("devDependencies:");
    expect(tree).toContain("typescript@5.0.0");
  });
});

describe("getDownloadTrends", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns formatted trends with sparkline", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        package: "typescript",
        start: "2025-01-01",
        end: "2025-01-14",
        downloads: [
          { day: "2025-01-01", downloads: 1000 },
          { day: "2025-01-02", downloads: 1500 },
          { day: "2025-01-03", downloads: 2000 },
        ],
      }),
    });

    const text = await getDownloadTrends("typescript", "last-month");
    expect(text).toContain("typescript");
    expect(text).toContain("2025-01-01");
    expect(text).toContain("Total:");
    expect(text).toContain("1,000");
  });
});
