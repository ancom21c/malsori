# Cloud Synchronization Design (Google Drive)

This document outlines the architecture for adding Google Drive synchronization to the local-first Malsori application.

## 1. Core Philosophy: Local-First with Cloud Extension
The app remains local-first. The database (IndexedDB) is the source of truth for the UI. Cloud sync is an *extension* to backup data and share state across devices.

## 2. Authentication (Client-Side)
Since there is no backend server, we use **Google Identity Services (GIS)** for client-side authentication.

- **Scope**: `https://www.googleapis.com/auth/drive.file`
  - *Why?* This grants access *only* to files created by this app. It prevents the app from messing with the user's other Drive files.

## 3. Data Mapping Strategy
We map the IndexedDB structure to a folder hierarchy in Google Drive, using standard file formats for better accessibility.

### Folder Structure
```text
/Malsori Data (App Root)
  /transcriptions
    /{uuid}
      metadata.json      <-- Maps to 'transcriptions' table (includes sync status)
      segments.json      <-- Maps to 'segments' table
      audio.webm         <-- Concatenated audio file (standard format)
      video.webm         <-- Concatenated video file (if applicable)
  /settings
    global_settings.json
  sync_manifest.json     <-- Critical for tracking state
```

> **Note on Media Files**: Instead of raw binary chunks, we will concatenate chunks into standard media files (e.g., `.webm`, `.wav`) before uploading. This allows users to play them directly in Google Drive.

## 4. Synchronization Logic

### A. Selective Synchronization (Record-Level Control)
Not all recordings need to be in the cloud. We introduce a **"Sync Enabled"** flag per transcription.

- **Local Schema Update**: Add `isCloudSynced: boolean` to `LocalTranscription`.
- **Default Behavior**: Configurable (e.g., "Auto-sync new recordings" ON/OFF).
- **UI**: A toggle switch on each transcription detail page or list item.

### B. The `sync_manifest.json`
Tracks the state of the cloud folder.
```json
{
  "deviceId": "uuid-of-last-uploader",
  "lastSyncedAt": "ISO-8601-timestamp",
  "schemaVersion": 1
}
```

### C. Sync Process (Two-Way)

1.  **Pull Phase (Metadata Sync)**:
    -   Fetch list of transcriptions from Cloud.
    -   For each cloud record:
        -   **If missing locally**: Create a **"Ghost Record"** in IndexedDB.
            -   Save `LocalTranscription` metadata.
            -   Set a flag `downloadStatus: 'not_downloaded'`.
            -   *Do NOT* download audio/video/segments yet.
        -   **If exists locally**: Update metadata if Cloud is newer.

2.  **On-Demand Download (Selective Fetch)**:
    -   User sees the list of transcriptions. "Ghost Records" have a cloud icon.
    -   **Action**: User clicks "Download" or tries to open the record.
    -   **Process**:
        -   Download `segments.json` -> Insert into `segments` table.
        -   Download `audio.webm` -> Split into chunks -> Insert into `audioChunks` table.
        -   Download `video.webm` -> Split into chunks -> Insert into `videoChunks` table.
        -   Update `downloadStatus: 'downloaded'`.

3.  **Push Phase**:
    -   Iterate local transcriptions where `isCloudSynced === true`.
    -   If Local is newer than Cloud (or Cloud missing) -> Upload JSONs and Media Files.
    -   Update `sync_manifest.json`.

## 5. Safety: Handling Account Switching
We must prevent merging data from User A into User B's account accidentally.

### Mechanism: Local "Sync Session" State
In `localStorage`:
```typescript
interface SyncSession {
  connectedAccountId: string; // Google User ID
  lastSyncTimestamp: string;
}
```

### Scenario: User Connects a Google Account
1.  **Authenticate** -> Get `newAccountId`.
2.  **Check Previous Session**:
    - **Different Account**: Trigger **"Conflict Resolution Dialog"**.

### The "Conflict Resolution Dialog"
Options:
1.  **Merge**: Upload `isCloudSynced=true` items to new account.
2.  **Replace**: Wipe local DB and download from new account.
3.  **Separate**: Cancel or disconnect.

## 6. Implementation Details: Google Auth & Drive API

Yes, this is fully possible in a browser-only (client-side) environment.

### A. Google Identity Services (GIS)
We will use the **Google Identity Services SDK** (the modern replacement for `gapi.auth2`).

-   **Library**: Load `<script src="https://accounts.google.com/gsi/client" async defer></script>`.
-   **Flow**: **Token Model** (Implicit Grant).
    -   Since we don't have a backend server to exchange authorization codes, we request an `access_token` directly from Google.
    -   *Note*: This token is short-lived (1 hour). We need to handle expiration gracefully.

### B. Connection Flow
1.  **Setup**: Create a project in Google Cloud Console -> Create "OAuth 2.0 Client ID" (Web Application).
2.  **User Action**: User clicks "Connect Google Drive".
3.  **SDK Call**:
    ```javascript
    const client = google.accounts.oauth2.initTokenClient({
      client_id: 'YOUR_CLIENT_ID',
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response) => {
        if (response.access_token) {
          // Save token and start sync
        }
      },
    });
    client.requestAccessToken();
    ```
4.  **API Requests**:
    -   Use the `access_token` in standard HTTP requests:
        ```javascript
        fetch('https://www.googleapis.com/drive/v3/files', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        ```

### C. Token Management
-   **Storage**: Store the `access_token` in memory (React Context) or `sessionStorage`. Do **NOT** store in `localStorage` for security reasons (though for a purely local app the risk is lower, it's bad practice).
-   **Expiration**: When an API call fails with `401 Unauthorized`, prompt the user to re-authorize (or try silent refresh if permitted).

## 7. Technical Challenges & Mitigations
-   **Large Files**: Audio/Video chunks can be large.
    -   *Mitigation*: Upload them as separate binary files. Check existence by ID before uploading to save bandwidth.
-   **Quota**: Google Drive has limits.
    -   *Mitigation*: Handle `403 Storage Quota Exceeded` gracefully.
-   **Concurrency**: Two devices syncing at once.
    -   *Mitigation*: "Last Write Wins" on a file level. Since `segments` are stored per-transcription, conflicts are limited to that specific transcription.
