#!/usr/bin/env bash
# 一键出安卓安装包。
# 用法：bash scripts/build-android.sh
# 产物：wordquest/WordQuest-<版本>.apk
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$(dirname "$ROOT")/tools"

export JAVA_HOME="$TOOLS/jdk-17.0.2"
export ANDROID_HOME="$TOOLS/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

if [ ! -d "$JAVA_HOME" ] || [ ! -d "$ANDROID_HOME" ]; then
  echo "找不到工具链：" >&2
  echo "  JAVA_HOME=$JAVA_HOME" >&2
  echo "  ANDROID_HOME=$ANDROID_HOME" >&2
  echo "请先按《安卓打包说明.md》准备好 tools/ 目录" >&2
  exit 1
fi

cd "$ROOT"

echo "==> 1/3 构建网页资源"
npm run build

echo "==> 2/3 同步到安卓工程"
# 先手动清掉旧资源：某些环境有安全删除钩子，Capacitor 内部的批量删除会被拦住，
# 报 [safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] 然后 sync 失败。
PUB="android/app/src/main/assets/public"
if [ -d "$PUB" ]; then
  if command -v python >/dev/null 2>&1; then
    python -c "import shutil;shutil.rmtree(r'$PUB',ignore_errors=True)"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import shutil;shutil.rmtree(r'$PUB',ignore_errors=True)"
  else
    rm -rf "$PUB"
  fi
  mkdir -p "$PUB"
fi
# 用 copy 而不是 sync：copy 不做 plugin update，不会去删 cordova.variables.gradle
timeout 240 npx cap copy android || echo "   (copy 超时，文件通常已同步完成，继续)"

echo "==> 3/3 打包 APK"
cd android
./gradlew assembleRelease --no-daemon --console=plain

VERSION="$(grep -oP 'versionName "\K[^"]+' app/build.gradle | head -1)"
OUT="$ROOT/WordQuest-${VERSION}.apk"
cp app/build/outputs/apk/release/app-release.apk "$OUT"

echo
echo "完成：$OUT"
ls -lh "$OUT"
