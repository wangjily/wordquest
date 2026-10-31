#!/usr/bin/env bash
# 词跃 WordQuest · 部署自检
# 用法：bash check-deploy.sh [站点目录] [访问地址]
#   例：bash check-deploy.sh /www/wwwroot/mapleblog/words http://127.0.0.1/words/
# 在服务器上直接跑，只读检查，不改任何东西。

ROOT="${1:-/www/wwwroot/mapleblog/words}"
URL="${2:-http://127.0.0.1/words/}"

ok=0; bad=0
pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; ok=$((ok+1)); }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; bad=$((bad+1)); }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }

echo "目录：$ROOT"
echo "地址：$URL"
echo

# ---------- 1. 文件完整性 ----------
echo "[1/4] 文件"
if [ ! -d "$ROOT" ]; then
  fail "目录不存在：$ROOT"
else
  [ -f "$ROOT/index.html" ] && pass "index.html" || fail "缺 index.html"

  js=$(find "$ROOT/assets" -maxdepth 1 -name '*.js' 2>/dev/null | wc -l)
  css=$(find "$ROOT/assets" -maxdepth 1 -name '*.css' 2>/dev/null | wc -l)
  [ "$js" -ge 1 ] && [ "$css" -ge 1 ] && pass "assets：${js} 个 js / ${css} 个 css" \
    || fail "assets 不全（js=${js} css=${css}）"

  n=$(find "$ROOT/corpus" -maxdepth 1 -name '*.json' 2>/dev/null | wc -l)
  if [ "$n" -eq 25 ]; then
    pass "corpus：25 个（索引 + 24 本词书）"
  elif [ "$n" -gt 0 ]; then
    fail "corpus 只有 ${n} 个，应该是 25 个"
  else
    fail "corpus 目录空的，语料没传上来"
  fi
fi

# ---------- 2. HTTP 可达 ----------
echo
echo "[2/4] 访问"
code=$(curl -s -o /dev/null -w '%{http_code}' "$URL" 2>/dev/null)
[ "$code" = "200" ] && pass "首页 $code" || fail "首页返回 $code（404 多半是少了结尾斜杠）"

code=$(curl -s -o /dev/null -w '%{http_code}' "${URL}corpus/index.json" 2>/dev/null)
[ "$code" = "200" ] && pass "corpus/index.json $code" || fail "corpus/index.json 返回 $code"

ctype=$(curl -s -o /dev/null -w '%{content_type}' "${URL}corpus/index.json" 2>/dev/null)
case "$ctype" in
  application/json*) pass "JSON MIME：$ctype" ;;
  *) fail "JSON MIME 是 $ctype，浏览器会当下载处理" ;;
esac

# ---------- 3. gzip ----------
echo
echo "[3/4] 压缩"
asset=$(find "$ROOT/assets" -maxdepth 1 -name '*.js' 2>/dev/null | head -1)
if [ -n "$asset" ]; then
  name=$(basename "$asset")
  enc=$(curl -s -I -H 'Accept-Encoding: gzip' "${URL}assets/${name}" 2>/dev/null | tr -d '\r' | awk -F': ' 'tolower($1)=="content-encoding"{print $2}')
  [ -n "$enc" ] && pass "JS 走了 $enc" || warn "JS 没压缩（不影响功能，只是慢）"
else
  warn "找不到 js 文件，跳过"
fi

if command -v nginx >/dev/null 2>&1; then
  hit=$(grep -Rhs 'gzip_types' /www/server/nginx/conf/ /www/server/panel/vhost/nginx/ 2>/dev/null | grep -c 'application/json')
  if [ "$hit" -gt 0 ]; then
    pass "gzip_types 含 application/json"
  else
    warn "gzip_types 里没看到 application/json —— 语料会 4MB 裸传（站点设置 → 配置文件里加）"
  fi
fi

# ---------- 4. 权限 ----------
echo
echo "[4/4] 权限"
if [ -d "$ROOT" ]; then
  owner=$(stat -c '%U:%G' "$ROOT" 2>/dev/null)
  perm=$(stat -c '%a' "$ROOT" 2>/dev/null)
  case "$owner" in
    www:www) pass "属主 $owner" ;;
    *) warn "属主是 $owner，建议 chown -R www:www $ROOT" ;;
  esac
  [ "${perm:0:1}" = "7" ] && pass "目录权限 $perm" || warn "目录权限 $perm，建议 chmod -R 755"
fi

echo
echo "----------------------------------------"
if [ "$bad" -eq 0 ]; then
  printf '\033[32m全部通过（%d 项）\033[0m，浏览器打开 %s 即可\n' "$ok" "$URL"
else
  printf '\033[31m%d 项没过\033[0m，先修上面带 ✗ 的\n' "$bad"
fi
exit "$bad"
