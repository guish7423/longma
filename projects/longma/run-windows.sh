#!/bin/bash
# LongMa Windows (WSLg) 启动脚本 (WSL 内使用)
# 用法: ./run-windows.sh
# 首次运行前确保:
#   sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev

set -e
cd "$(dirname "$0")"

echo "========================================"
echo "  LongMa Agent - 桌面伴侣"
echo "  专为 DeepSeek 模型优化"
echo "========================================"
echo ""

# 检查二进制
if [ ! -f ./src-tauri/target/release/longma ]; then
    echo "❌ 错误: 找不到 LongMa 二进制文件"
    echo "   请先在项目目录运行: cargo tauri build"
    exit 1
fi

echo "🚀 启动 LongMa..."
echo "   窗口将通过 WSLg 显示在 Windows 桌面"
echo ""
echo "   提示: 也可以从 Windows 文件管理器双击"
echo "   start-longma.bat 启动"
echo ""

export DISPLAY=:0
export GDK_BACKEND=x11
export LIBGL_ALWAYS_SOFTWARE=1
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export PULSE_SERVER=unix:/mnt/wslg/PulseServer

./src-tauri/target/release/longma

echo ""
echo "LongMa 已退出。"
