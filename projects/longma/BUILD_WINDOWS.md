# Windows 构建指南

LongMa 使用 Tauri v2 框架，需要特定平台的 WebView 后端。
**推荐在 Windows 上原生构建**，交叉编译从 Linux 到 Windows 不官方支持。

## 前置条件

1. 安装 [Rust](https://rustup.rs/)
2. 安装 [Node.js](https://nodejs.org/) (v18+)
3. 安装 [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Windows 10+ 已内置)

## 构建步骤

```powershell
# 1. 克隆项目
cd longma

# 2. 安装前端依赖
npm install

# 3. 安装 Tauri CLI
cargo install tauri-cli --version "^2"

# 4. 构建 Windows 版本
cargo tauri build
```

产物在 `src-tauri/target/release/bundle/msi/` 或 `nsis/` 目录。

## GitHub Actions CI （自动构建 Windows 包）

```yaml
# .github/workflows/build-windows.yml
name: Build Windows
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: dtolnay/rust-toolchain@stable
      - run: npm install
      - run: cargo tauri build
      - uses: actions/upload-artifact@v4
        with:
          name: LongMa-Windows
          path: src-tauri/target/release/bundle/
```

## WSL2 => Windows 传输

在 WSL2 中编译后，将 Linux 构建产物复制到 Windows：

```bash
# 从 WSL2 复制 Linux DEB 到 Windows
cp src-tauri/target/release/bundle/deb/LongMa_0.1.0_amd64.deb /mnt/c/Users/YourName/Downloads/
```
