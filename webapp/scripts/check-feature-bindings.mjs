#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const KNOWN_FEATURE_KEYS = new Set([
  "capture.realtime",
  "capture.file",
  "artifact.summary",
  "artifact.qa",
  "translate.turn_final",
  "translate.turn_partial",
  "tts.speak",
  "tts.stream",
]);

const FEATURE_CAPABILITIES = {
  "capture.realtime": ["stt.realtime"],
  "capture.file": ["stt.file"],
  "artifact.summary": ["artifact.summary"],
  "artifact.qa": ["artifact.qa"],
  "translate.turn_final": ["translate.turn_final"],
  "translate.turn_partial": ["translate.turn_partial"],
  "tts.speak": ["tts.speak"],
  "tts.stream": ["tts.stream"],
};

const VALID_PROFILE_KINDS = new Set(["stt", "llm", "translate", "tts", "multimodal"]);
const VALID_HEALTH = new Set(["unknown", "healthy", "degraded", "unreachable", "misconfigured"]);
const USABLE_HEALTH = new Set(["unknown", "healthy", "degraded"]);

function parseArgs(argv) {
  const result = {
    profilesFile: null,
    bindingsFile: null,
    requiredFeatures: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--profiles-file") {
      result.profilesFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--bindings-file") {
      result.bindingsFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--require-feature") {
      const feature = argv[index + 1] ?? null;
      if (feature) {
        result.requiredFeatures.push(feature);
      }
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return result;
}

function parseJsonArray(raw, label) {
  if (!raw) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON for ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON array.`);
  }

  return parsed;
}

function normalizeProfile(entry, index) {
  const id = String(entry.id ?? "").trim();
  const label = String(entry.label ?? "").trim();
  const kind = String(entry.kind ?? "").trim();
  const baseUrl = String(entry.base_url ?? entry.baseUrl ?? "").trim().replace(/\/+$/, "");
  const capabilities = Array.isArray(entry.capabilities)
    ? entry.capabilities.map((capability) => String(capability).trim()).filter(Boolean)
    : [];
  const enabled = entry.enabled !== false;
  const health = String(entry.health?.status ?? "unknown").trim();
  const defaultModel = typeof entry.default_model === "string"
    ? entry.default_model.trim() || null
    : typeof entry.defaultModel === "string"
      ? entry.defaultModel.trim() || null
      : null;

  if (!id) {
    throw new Error(`profiles[${index}] is missing id`);
  }
  if (!label) {
    throw new Error(`profiles[${index}] is missing label`);
  }
  if (!VALID_PROFILE_KINDS.has(kind)) {
    throw new Error(`profiles[${index}] has invalid kind: ${kind}`);
  }
  if (!baseUrl) {
    throw new Error(`profiles[${index}] is missing base_url/baseUrl`);
  }
  if (!VALID_HEALTH.has(health)) {
    throw new Error(`profiles[${index}] has invalid health status: ${health}`);
  }

  return {
    id,
    label,
    kind,
    baseUrl,
    capabilities,
    enabled,
    health,
    defaultModel,
  };
}

function normalizeBinding(entry, index) {
  const featureKey = String(entry.feature_key ?? entry.featureKey ?? "").trim();
  const primaryBackendProfileId = String(
    entry.primary_backend_profile_id ?? entry.primaryBackendProfileId ?? ""
  ).trim();
  const fallbackBackendProfileId = String(
    entry.fallback_backend_profile_id ?? entry.fallbackBackendProfileId ?? ""
  ).trim() || null;
  const enabled = entry.enabled !== false;
  const modelOverride = typeof entry.model_override === "string"
    ? entry.model_override.trim() || null
    : typeof entry.modelOverride === "string"
      ? entry.modelOverride.trim() || null
      : null;

  if (!KNOWN_FEATURE_KEYS.has(featureKey)) {
    throw new Error(`bindings[${index}] has invalid feature key: ${featureKey}`);
  }
  if (!primaryBackendProfileId) {
    throw new Error(`bindings[${index}] is missing primary backend profile id`);
  }

  return {
    featureKey,
    primaryBackendProfileId,
    fallbackBackendProfileId,
    enabled,
    modelOverride,
  };
}

function profileSupports(profile, featureKey) {
  const required = FEATURE_CAPABILITIES[featureKey] ?? [];
  return required.every((capability) => profile.capabilities.includes(capability));
}

function isUsableProfile(profile) {
  return profile.enabled && USABLE_HEALTH.has(profile.health);
}

function resolveBinding(featureKey, bindingsByFeature, profilesById) {
  const binding = bindingsByFeature.get(featureKey);
  const requiredCapabilities = FEATURE_CAPABILITIES[featureKey] ?? [];

  if (!binding) {
    return {
      featureKey,
      status: "unavailable",
      reason: "binding_missing",
      resolvedBackendProfileId: null,
      requiredCapabilities,
    };
  }

  if (!binding.enabled) {
    return {
      featureKey,
      status: "disabled",
      reason: "binding_disabled",
      resolvedBackendProfileId: null,
      requiredCapabilities,
    };
  }

  const primary = profilesById.get(binding.primaryBackendProfileId);
  if (!primary) {
    return {
      featureKey,
      status: "misconfigured",
      reason: "profile_missing",
      resolvedBackendProfileId: null,
      requiredCapabilities,
    };
  }

  if (profileSupports(primary, featureKey) && isUsableProfile(primary)) {
    return {
      featureKey,
      status: "ready",
      reason: "primary_selected",
      resolvedBackendProfileId: primary.id,
      requiredCapabilities,
      model: binding.modelOverride ?? primary.defaultModel ?? null,
    };
  }

  const fallback = binding.fallbackBackendProfileId
    ? profilesById.get(binding.fallbackBackendProfileId)
    : null;

  if (fallback && profileSupports(fallback, featureKey) && isUsableProfile(fallback)) {
    return {
      featureKey,
      status: "fallback",
      reason: "fallback_selected",
      resolvedBackendProfileId: fallback.id,
      requiredCapabilities,
      model: binding.modelOverride ?? fallback.defaultModel ?? null,
    };
  }

  return {
    featureKey,
    status: profileSupports(primary, featureKey) ? "unavailable" : "misconfigured",
    reason: profileSupports(primary, featureKey) ? "primary_unhealthy" : "capability_mismatch",
    resolvedBackendProfileId: null,
    requiredCapabilities,
  };
}

async function readInput(filePath, envValue) {
  if (filePath) {
    return readFile(filePath, "utf8");
  }
  return envValue ?? "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const profilesRaw = await readInput(args.profilesFile, process.env.VITE_BACKEND_PROFILES_JSON);
  const bindingsRaw = await readInput(args.bindingsFile, process.env.VITE_FEATURE_BINDINGS_JSON);

  const profiles = parseJsonArray(profilesRaw, "profiles").map(normalizeProfile);
  const bindings = parseJsonArray(bindingsRaw, "bindings").map(normalizeBinding);

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const bindingsByFeature = new Map(bindings.map((binding) => [binding.featureKey, binding]));
  const featureKeys = args.requiredFeatures.length > 0
    ? args.requiredFeatures
    : bindings.length > 0
      ? bindings.map((binding) => binding.featureKey)
      : [];

  console.log("[Feature Binding Runtime]");
  console.log(`- profiles: ${profiles.length}`);
  console.log(`- bindings: ${bindings.length}`);

  if (featureKeys.length === 0) {
    console.log("- no binding features configured");
    return;
  }

  let failed = false;
  for (const featureKey of featureKeys) {
    if (!KNOWN_FEATURE_KEYS.has(featureKey)) {
      throw new Error(`Unknown feature key requested: ${featureKey}`);
    }

    const resolution = resolveBinding(featureKey, bindingsByFeature, profilesById);
    const backendText = resolution.resolvedBackendProfileId
      ? ` -> ${resolution.resolvedBackendProfileId}`
      : "";
    console.log(`- ${featureKey}: ${resolution.status}${backendText}`);

    if (args.requiredFeatures.includes(featureKey)) {
      const ready = resolution.status === "ready" || resolution.status === "fallback";
      if (!ready) {
        failed = true;
      }
    }
  }

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[Feature Binding Runtime] FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
