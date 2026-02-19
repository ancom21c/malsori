#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const TODO_ROOT = path.join(process.cwd(), "docs", "todo");

const STAGES = [
  { column: "Spec", section: "## Spec", mode: "section" },
  {
    column: "Plan Review",
    section: "## Review Checklist (Plan Review)",
    mode: "checklist",
  },
  { column: "Implement", section: "## Implementation Log", mode: "checklist" },
  {
    column: "Impl Review",
    section: "## Review Checklist (Implementation Review)",
    mode: "checklist",
  },
  { column: "Verify", section: "## Verify", mode: "checklist_optional" },
];

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(fullPath);
      }
      return [fullPath];
    })
  );
  return files.flat();
}

function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return null;
  }
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function findTaskBoard(lines) {
  for (let i = 0; i < lines.length; i += 1) {
    const row = parseTableRow(lines[i]);
    if (!row) {
      continue;
    }
    if (!row.includes("ID") || !row.includes("문서")) {
      continue;
    }
    const separator = parseTableRow(lines[i + 1] ?? "");
    if (!separator) {
      continue;
    }
    return { headerIndex: i, headers: row };
  }
  return null;
}

function normalizeStatus(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "done") {
    return "Done";
  }
  if (normalized === "pending") {
    return "Pending";
  }
  return null;
}

function extractDocPath(cell) {
  const codePath = cell.match(/`([^`]+)`/);
  if (codePath) {
    return codePath[1];
  }
  const markdownLink = cell.match(/\(([^)]+)\)/);
  if (markdownLink) {
    return markdownLink[1];
  }
  return cell.trim();
}

function getSectionLines(markdownLines, sectionTitle) {
  const start = markdownLines.findIndex((line) => line.trim() === sectionTitle);
  if (start < 0) {
    return null;
  }
  const section = [];
  for (let i = start + 1; i < markdownLines.length; i += 1) {
    if (/^##\s+/.test(markdownLines[i].trim())) {
      break;
    }
    section.push(markdownLines[i]);
  }
  return section;
}

function checklistSummary(sectionLines) {
  let checked = 0;
  let unchecked = 0;
  sectionLines.forEach((line) => {
    const match = line.match(/^\s*-\s*\[([xX ])\]\s+/);
    if (!match) {
      return;
    }
    if (match[1].toLowerCase() === "x") {
      checked += 1;
      return;
    }
    unchecked += 1;
  });
  return { checked, unchecked, total: checked + unchecked };
}

function validateStage({
  boardPath,
  taskId,
  docPath,
  stage,
  boardStatus,
  checklist,
  sectionLines,
}) {
  const issues = [];
  if (!boardStatus) {
    issues.push(
      `${boardPath}: ${taskId} ${stage.column} status must be Done/Pending (current: "${boardStatus ?? ""}").`
    );
    return issues;
  }

  if (stage.mode === "section") {
    const hasContent = sectionLines.some((line) => line.trim().length > 0);
    if (boardStatus === "Done" && !hasContent) {
      issues.push(`${boardPath}: ${taskId} ${stage.column} is Done, but ${docPath} section is empty.`);
    }
    return issues;
  }

  if (checklist.total === 0) {
    if (stage.mode === "checklist") {
      issues.push(
        `${boardPath}: ${taskId} ${stage.column} is ${boardStatus}, but ${docPath} ${stage.section} has no checklist.`
      );
    }
    return issues;
  }

  if (boardStatus === "Done" && checklist.checked !== checklist.total) {
    issues.push(
      `${boardPath}: ${taskId} ${stage.column} is Done, but ${docPath} has ${checklist.checked}/${checklist.total} checked.`
    );
  }

  if (boardStatus === "Pending" && checklist.unchecked === 0) {
    issues.push(
      `${boardPath}: ${taskId} ${stage.column} is Pending, but ${docPath} checklist has no remaining unchecked item.`
    );
  }

  return issues;
}

async function validateBoard(boardPath) {
  const markdown = await fs.readFile(boardPath, "utf8");
  const lines = markdown.split(/\r?\n/);
  const table = findTaskBoard(lines);
  if (!table) {
    return [
      `${boardPath}: task board table not found (expected a table with "ID" and "문서" columns).`,
    ];
  }

  const headerMap = new Map(table.headers.map((header, index) => [header, index]));
  const missingColumns = STAGES.map((stage) => stage.column).filter(
    (column) => !headerMap.has(column)
  );
  if (!headerMap.has("ID")) {
    missingColumns.push("ID");
  }
  if (!headerMap.has("문서")) {
    missingColumns.push("문서");
  }
  if (missingColumns.length > 0) {
    return [`${boardPath}: missing required columns: ${missingColumns.join(", ")}.`];
  }

  const issues = [];
  for (let i = table.headerIndex + 2; i < lines.length; i += 1) {
    const row = parseTableRow(lines[i]);
    if (!row) {
      if (lines[i].trim() === "") {
        break;
      }
      continue;
    }

    const taskId = row[headerMap.get("ID")] ?? "";
    if (!/^T\d+$/i.test(taskId)) {
      continue;
    }

    const docCell = row[headerMap.get("문서")] ?? "";
    const relativeDocPath = extractDocPath(docCell);
    const absoluteDocPath = path.join(process.cwd(), relativeDocPath);

    let taskMarkdown;
    try {
      taskMarkdown = await fs.readFile(absoluteDocPath, "utf8");
    } catch {
      issues.push(`${boardPath}: ${taskId} references missing doc "${relativeDocPath}".`);
      continue;
    }

    const taskLines = taskMarkdown.split(/\r?\n/);
    for (const stage of STAGES) {
      const statusCell = row[headerMap.get(stage.column)] ?? "";
      const status = normalizeStatus(statusCell);
      const sectionLines = getSectionLines(taskLines, stage.section);
      if (!sectionLines) {
        issues.push(
          `${boardPath}: ${taskId} ${stage.column} mapped section "${stage.section}" missing in ${relativeDocPath}.`
        );
        continue;
      }

      const checklist = checklistSummary(sectionLines);
      issues.push(
        ...validateStage({
          boardPath,
          taskId,
          docPath: relativeDocPath,
          stage,
          boardStatus: status,
          checklist,
          sectionLines,
        })
      );
    }
  }

  return issues;
}

async function main() {
  let boardFiles = [];
  try {
    const allFiles = await walkFiles(TODO_ROOT);
    boardFiles = allFiles.filter((file) => path.basename(file) === "README.md");
  } catch (error) {
    console.error(`Failed to scan docs/todo: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  if (boardFiles.length === 0) {
    console.log("No todo boards found under docs/todo.");
    return;
  }

  const issues = (await Promise.all(boardFiles.map((board) => validateBoard(board)))).flat();
  if (issues.length > 0) {
    console.error("Todo board consistency check failed:");
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }

  console.log(`Todo board consistency check passed (${boardFiles.length} board(s)).`);
}

void main();
