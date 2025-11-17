export type BrowserPermissionState = "granted" | "denied" | "prompt" | "unknown";

type ExtendedPermissionName = PermissionName | "microphone" | "persistent-storage";

async function queryPermissionState(
  name: ExtendedPermissionName
): Promise<BrowserPermissionState | undefined> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return undefined;
  }
  try {
    const descriptor: PermissionDescriptor = { name: name as PermissionName };
    const status = await navigator.permissions.query(descriptor);
    if (
      status.state === "granted" ||
      status.state === "denied" ||
      status.state === "prompt"
    ) {
      return status.state;
    }
  } catch {
    // ignore unsupported descriptors
  }
  return undefined;
}

export async function checkMicrophonePermission(): Promise<BrowserPermissionState> {
  const permissionState = await queryPermissionState("microphone");
  return permissionState ?? "unknown";
}

export async function requestMicrophonePermission(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export async function checkPersistentStoragePermission(): Promise<BrowserPermissionState> {
  const permissionState = await queryPermissionState("persistent-storage");
  if (permissionState) {
    return permissionState;
  }
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) {
    return "unknown";
  }
  try {
    const persisted = await navigator.storage.persisted();
    return persisted ? "granted" : "prompt";
  } catch {
    return "unknown";
  }
}

export async function requestPersistentStoragePermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
