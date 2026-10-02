# AstroBox-NG-Theme-Repo

AstroBox 装扮商城（Theme Market）官方主题仓库。

## 目录结构

```text
.
├── index.txt               # 索引列表，每行一个主题文件夹名
├── index.json              # 聚合主题清单元数据（供商城高速浏览）
├── xxx/         # 主题文件夹
│   ├── theme.json          # 主题与 UI 装扮描述
│   ├── preview.png         # 效果预览图（推荐 16:9 / 16:10）
│   └── xxx.abtheme # 打包好的主题包
└── ...
```

## 主题制作与规范

1. **主题格式**：遵循 AstroBox 主题规范，配置可包含 MD3 强调色（accent）、配色变体（variant）、背景重着色（recolor）及全套界面装扮（ui）。
2. **校验与打包**：使用 AstroBox-NG 提供的校验打包工具：
   ```bash
   node scripts/validate-theme.mjs <主题文件夹> --pack <输出文件名.abtheme>
   ```
3. **提交与收录**：制作完成后发起 Pull Request。仓库已配置 GitHub Actions 自动化工作流，在提交合入 `main` 分支时会自动根据各主题文件夹扫描并生成 `index.json` 与 `index.txt`，无需手动维护索引文件；本地也可运行 `npm run build` 手动生成预览。
