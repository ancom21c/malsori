# Malsori WebApp Architecture & Agent Guide

This document serves as a high-level guide for AI Agents working on the Malsori WebApp. It outlines core architectural decisions, design patterns, and feature specifications.

## 1. Project Overview
Malsori is a local-first web application for real-time audio transcription and recording.
- **Stack**: React, Vite, TypeScript, TailwindCSS (if applicable), Dexie.js (IndexedDB).
- **Core Philosophy**: Local-First. User data resides primarily in the browser's IndexedDB.

## 2. Cloud Synchronization (New)
**Status**: Design Phase (Approved)
**Design Doc**: [cloud_sync_design.md](./cloud_sync_design.md)

### Architecture
- **Provider**: Google Drive (via Google Identity Services).
- **Auth**: Client-side Token Model (No backend).
- **Data Strategy**:
    - **Metadata**: `metadata.json` (Synced first).
    - **Media**: `audio.webm`, `video.webm` (Standard formats).
    - **Segments**: `segments.json`.
- **Sync Logic**:
    - **Selective Sync**: User toggles `isCloudSynced` per record.
    - **On-Demand Download**: Cloud records appear as "Ghost Records" locally until explicitly downloaded.
    - **Conflict Resolution**: Manual resolution dialog on account switch.

### Key Components to Implement
1.  **GoogleAuthProvider**: Context for GIS SDK.
2.  **GoogleDriveService**: API wrapper for Drive v3.
3.  **SyncManager**: Logic for Pull/Push/Merge.
4.  **UI**: Sync Status Indicator, Conflict Dialog, Sync Toggle.

## 3. Database Schema (Dexie)
See `src/data/app-db.ts`.
- **Tables**: `transcriptions`, `segments`, `audioChunks`, `videoChunks`, `presets`, `settings`.
- **New Fields**: `LocalTranscription.isCloudSynced`, `LocalTranscription.downloadStatus`.
