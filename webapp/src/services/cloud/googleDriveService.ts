const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_API_BASE = "https://www.googleapis.com/upload/drive/v3";

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    parents?: string[];
    modifiedTime?: string;
    appProperties?: Record<string, string>;
}

type AccessTokenProvider = () => string | Promise<string>;

export class GoogleDriveService {
    private accessToken: string | AccessTokenProvider;

    constructor(accessToken: string | AccessTokenProvider) {
        this.accessToken = accessToken;
    }

    private async resolveAccessToken(): Promise<string> {
        if (typeof this.accessToken === "function") {
            return await this.accessToken();
        }
        return this.accessToken;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const token = await this.resolveAccessToken();
        const headers = {
            Authorization: `Bearer ${token}`,
            ...options.headers,
        };
        const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, { ...options, headers });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(error.error?.message || `Drive API Error: ${response.status}`);
        }
        return response.json();
    }

    async listFiles(query: string): Promise<DriveFile[]> {
        const params = new URLSearchParams({
            q: query,
            fields: "files(id, name, mimeType, parents, modifiedTime, appProperties)",
            spaces: "drive",
        });
        const data = await this.request(`/files?${params}`);
        return data.files || [];
    }

    async getFileMetadata(fileId: string): Promise<DriveFile> {
        return this.request(`/files/${fileId}?fields=id,name,mimeType,parents,modifiedTime,appProperties`);
    }

    async downloadFile(fileId: string): Promise<Blob> {
        const token = await this.resolveAccessToken();
        const headers = { Authorization: `Bearer ${token}` };
        const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, { headers });
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status}`);
        }
        return response.blob();
    }

    async createFolder(name: string, parentId?: string): Promise<DriveFile> {
        const metadata = {
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: parentId ? [parentId] : undefined,
        };
        return this.request("/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metadata),
        });
    }

    async uploadFile(
        name: string,
        blob: Blob,
        parentId?: string,
        mimeType?: string,
        existingFileId?: string
    ): Promise<DriveFile> {
        const metadata = {
            name,
            mimeType: mimeType || blob.type,
            parents: parentId ? [parentId] : undefined,
        };

        const form = new FormData();
        form.append(
            "metadata",
            new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        form.append("file", blob);

        const method = existingFileId ? "PATCH" : "POST";
        const url = existingFileId
            ? `${UPLOAD_API_BASE}/files/${existingFileId}?uploadType=multipart`
            : `${UPLOAD_API_BASE}/files?uploadType=multipart`;

        const token = await this.resolveAccessToken();
        const response = await fetch(url, {
            method,
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }
        return response.json();
    }

    async deleteFile(fileId: string): Promise<void> {
        await this.request(`/files/${fileId}`, { method: "DELETE" });
    }
}
