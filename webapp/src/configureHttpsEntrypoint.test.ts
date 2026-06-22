import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

describe("40-configure-https.sh", () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { force: true, recursive: true });
      }
    }
  });

  function createFixture() {
    const root = mkdtempSync(path.join(os.tmpdir(), "malsori-nginx-entrypoint-"));
    tempRoots.push(root);

    const nginxRoot = path.join(root, "etc", "nginx");
    const confDir = path.join(nginxRoot, "conf.d");
    const malsoriDir = path.join(nginxRoot, "malsori");

    mkdirSync(confDir, { recursive: true });
    mkdirSync(malsoriDir, { recursive: true });

    const defaultConf = path.join(confDir, "default.conf");
    const httpConf = path.join(malsoriDir, "http.conf");
    const httpsConf = path.join(malsoriDir, "https.conf");
    const scriptPath = path.join(root, "40-configure-https.sh");
    const scriptTemplate = readFileSync(
      path.resolve(import.meta.dirname, "..", "docker-entrypoint.d", "40-configure-https.sh"),
      "utf8",
    );

    writeFileSync(defaultConf, "orig\n");
    writeFileSync(httpConf, "http\n");
    writeFileSync(httpsConf, "https\n");
    writeFileSync(scriptPath, scriptTemplate.replaceAll("/etc/nginx", nginxRoot));

    return { defaultConf, scriptPath };
  }

  it("replaces default.conf with http config outside Kubernetes", () => {
    const { defaultConf, scriptPath } = createFixture();

    execFileSync("sh", [scriptPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        MALSORI_ENABLE_HTTPS: "0",
      },
    });

    expect(readFileSync(defaultConf, "utf8")).toBe("http\n");
  });

  it("keeps the Kubernetes-provided nginx config in place", () => {
    const { defaultConf, scriptPath } = createFixture();

    const stdout = execFileSync("sh", [scriptPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        KUBERNETES_SERVICE_HOST: "10.0.0.1",
        MALSORI_ENABLE_HTTPS: "1",
      },
    });

    expect(stdout).toContain("Skipping nginx config swap because Kubernetes provides");
    expect(readFileSync(defaultConf, "utf8")).toBe("orig\n");
  });
});
