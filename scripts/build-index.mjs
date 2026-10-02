#!/usr/bin/env node
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const IGNORED_DIRS = new Set([".git", ".github", "scripts", "node_modules"]);
const PREVIEW_NAMES = ["preview.png", "preview.webp", "preview.jpg", "preview.jpeg"];

function isDirectory(filePath) {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function findThemeDirectories(root) {
  const entries = readdirSync(root, { withFileTypes: true });
  const themeDirs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name.startsWith(".") || IGNORED_DIRS.has(name)) continue;

    const themeJsonPath = path.join(root, name, "theme.json");
    if (existsSync(themeJsonPath)) {
      themeDirs.push(name);
    }
  }

  return themeDirs.sort((a, b) => a.localeCompare(b));
}

function scanTheme(folder) {
  const folderPath = path.join(repoRoot, folder);
  const themeJsonPath = path.join(folderPath, "theme.json");

  let rawJson = {};
  try {
    rawJson = JSON.parse(readFileSync(themeJsonPath, "utf-8"));
  } catch (err) {
    console.error(`[build-index] 无法解析 ${folder}/theme.json:`, err.message);
    throw err;
  }

  const id = (rawJson.id || folder).trim();
  const name = (rawJson.name || folder).trim();
  const version = rawJson.version || "1.0.0";
  const author = rawJson.author || "AstroBox Community";
  const description = rawJson.description || "";
  const accent = rawJson.accent || { mode: "preset", preset: "blue" };
  const variant = rawJson.variant;
  const recolor = typeof rawJson.recolor === "boolean" ? rawJson.recolor : undefined;
  const ui = rawJson.ui;

  // 1. 查找预览图文件
  let previewFile = null;
  // 如果 theme.json 中声明了相对文件且存在
  const customPreview = rawJson.preview || (typeof rawJson.previewImage === "string" && !rawJson.previewImage.startsWith("data:") ? rawJson.previewImage : null);
  if (customPreview && existsSync(path.join(folderPath, path.basename(customPreview)))) {
    previewFile = path.basename(customPreview);
  } else {
    for (const candidate of PREVIEW_NAMES) {
      if (existsSync(path.join(folderPath, candidate))) {
        previewFile = candidate;
        break;
      }
    }
  }
  const preview = previewFile ? `${folder}/${previewFile}` : `${folder}/preview.png`;

  // 2. 查找 .abtheme 包文件
  let packageFile = null;
  const defaultPkg = `${folder}.abtheme`;
  if (existsSync(path.join(folderPath, defaultPkg))) {
    packageFile = defaultPkg;
  } else {
    const files = readdirSync(folderPath);
    const abtheme = files.find((f) => f.endsWith(".abtheme"));
    if (abtheme) {
      packageFile = abtheme;
    }
  }
  const packageUrl = packageFile ? `${folder}/${packageFile}` : `${folder}/${folder}.abtheme`;

  return {
    id,
    name,
    version,
    author,
    description,
    folder,
    accent,
    ...(variant ? { variant } : {}),
    ...(typeof recolor === "boolean" ? { recolor } : {}),
    preview,
    packageUrl,
    manifest: {
      id,
      name,
      version,
      author,
      description,
      accent,
      ...(variant ? { variant } : {}),
      ...(typeof recolor === "boolean" ? { recolor } : {}),
      preview,
      packageUrl,
      ...(ui ? { ui } : {}),
    },
  };
}

function main() {
  const isCheckMode = process.argv.includes("--check");
  const folders = findThemeDirectories(repoRoot);

  console.log(`[build-index] 扫描到 ${folders.length} 个主题目录: ${folders.join(", ") || "(无)"}`);

  const themes = folders.map(scanTheme);

  const indexData = {
    version: 1,
    updatedAt: new Date().toISOString(),
    themes,
  };

  const indexJsonContent = JSON.stringify(indexData, null, 2) + "\n";
  const indexTxtContent = folders.length > 0 ? folders.join("\n") + "\n" : "";

  const indexJsonPath = path.join(repoRoot, "index.json");
  const indexTxtPath = path.join(repoRoot, "index.txt");

  if (isCheckMode) {
    let hasDiff = false;
    if (existsSync(indexTxtPath)) {
      const currentTxt = readFileSync(indexTxtPath, "utf-8");
      if (currentTxt !== indexTxtContent) {
        console.error("✖ index.txt 内容需要更新");
        hasDiff = true;
      }
    } else if (indexTxtContent) {
      console.error("✖ index.txt 缺失");
      hasDiff = true;
    }

    if (existsSync(indexJsonPath)) {
      try {
        const currentJson = JSON.parse(readFileSync(indexJsonPath, "utf-8"));
        // 忽略 updatedAt 对比 themes
        const cleanCurrent = { ...currentJson, updatedAt: undefined };
        const cleanNew = { ...indexData, updatedAt: undefined };
        if (JSON.stringify(cleanCurrent) !== JSON.stringify(cleanNew)) {
          console.error("✖ index.json 内容需要更新");
          hasDiff = true;
        }
      } catch {
        console.error("✖ 无法读取现有的 index.json");
        hasDiff = true;
      }
    } else {
      console.error("✖ index.json 缺失");
      hasDiff = true;
    }

    if (hasDiff) {
      process.exit(1);
    }
    console.log("✔ index.json 和 index.txt 已是最新，检查通过");
    process.exit(0);
  }

  writeFileSync(indexJsonPath, indexJsonContent, "utf-8");
  writeFileSync(indexTxtPath, indexTxtContent, "utf-8");

  console.log(`✔ 已成功生成 index.json (${themes.length} 个主题)`);
  console.log(`✔ 已成功更新 index.txt`);
}

main();
