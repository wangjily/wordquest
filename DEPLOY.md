# 部署指南 · 词跃 WordQuest

本项目是**纯静态前端应用**：`npm run build` 产出的 `dist/` 目录就是完整网站，不含 Node 服务端、不需要数据库。
因此它几乎可以部署到任何地方——只要能放静态文件。

```
dist/
├── index.html
└── assets/
    ├── index-xxxx.js     ← 全部逻辑打包
    └── index-xxxx.css    ← 全部样式
```

> 说明：路由使用 **Hash 模式**（`/#/learn`），所以**不需要任何服务器 rewrite 规则**，直接把文件传上去就能用，不会出现刷新 404。

---

## 方式一：上传静态文件（宝塔面板 / 任何虚拟主机）

最简单，5 分钟上线。

### 1. 本地构建

```bash
cd wordquest
npm install
npm run build
```

### 2. 上传

把 `dist/` 目录里的**全部内容**（不是 dist 文件夹本身）上传到网站根目录：

- 宝塔面板：`网站 → 你的站点 → 根目录`，把 `dist` 里的 `index.html` 和 `assets` 文件夹传进去
- 虚拟主机：通过 FTP 上传到 `wwwroot` / `htdocs` / `public_html`
- 对象存储（OSS/COS/七牛）：把 `dist` 目录作为静态网站源，开启「静态网站托管」，默认首页设 `index.html`

### 3. 访问

浏览器打开域名即可。若显示 403/404，检查 `index.html` 是否在根目录第一层。

---

## 方式二：Nginx（自有服务器，推荐）

### 1. 上传并解压

```bash
# 本机
scp -r dist/* root@你的服务器IP:/var/www/wordquest/

# 服务器
mkdir -p /var/www/wordquest
```

### 2. 新建配置 `/etc/nginx/conf.d/wordquest.conf`

```nginx
server {
    listen 80;
    server_name your-domain.com;      # 换成你的域名，没有域名就写服务器 IP

    root /var/www/wordquest;
    index index.html;
    charset utf-8;

    gzip on;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. 生效

```bash
nginx -t          # 语法检查
nginx -s reload   # 热重载
```

### 4. 配 HTTPS（强烈建议）

```bash
# 用 certbot 免费申请，自动改写 nginx 配置
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

> 注意：浏览器的语音合成（TTS）和部分 API 在 **HTTPS** 下才稳定可用，正式环境务必上 HTTPS。

---

## 方式三：Docker（最省心，一条命令）

项目已内置 `Dockerfile` + `nginx.conf` + `docker-compose.yml`。

```bash
cd wordquest
docker compose up -d --build
```

访问 `http://服务器IP:8080`。

常用命令：

```bash
docker compose logs -f      # 看日志
docker compose restart      # 重启
docker compose down         # 停止并移除
docker compose up -d --build  # 改了代码后重新构建
```

想换端口，改 `docker-compose.yml` 里的 `"8080:80"`，比如 `"80:80"`。

---

## 方式四：托管平台（零运维）

| 平台 | 操作 |
|---|---|
| Vercel | 导入仓库 → Framework 选 Vite → Build `npm run build` → Output `dist` |
| Netlify | Build command `npm run build`，Publish directory `dist` |
| Cloudflare Pages | 同上，构建命令 `npm run build`，输出目录 `dist` |
| GitHub Pages | 推到仓库后 `npm run build`，把 `dist` 推到 `gh-pages` 分支 |

`vite.config.ts` 里已设置 `base: './'`，因此在**子目录**（如 `https://example.com/wordquest/`）下也能正常加载资源。

---

## 发版流程（后续更新）

```bash
git pull                 # 或者直接改代码
npm install              # 依赖有变动时才需要
npm run build            # 产出新的 dist
# 上传新的 dist 覆盖服务器旧文件即可
```

由于 `assets/` 文件名带哈希，旧文件可以安全保留，不会出现缓存错乱；`index.html` 设为不缓存，用户刷新即拿到新版本。

---

## 常见问题

**Q：打开是空白页？**
按 F12 看 Console。通常是资源路径问题——确认上传的是 `dist` **里面的内容**，且 `index.html` 与 `assets/` 在同一层。

**Q：刷新页面 404？**
不太可能发生（用的是 Hash 路由）。如果确实出现，说明服务器把 `/#/learn` 里的 `#` 之后截掉了，检查是否有 CDN 或安全软件做了 URL 重写。

**Q：单词发音没声音？**
1. 需要 HTTPS 或 localhost（浏览器安全策略）；
2. 部分系统没装对应语言的语音包（如日语），换 Chrome/Edge 试试；
3. 设置页确认「发音与音效」是打开的。

**Q：数据存在哪？会不会丢？**
全部存在浏览器 `localStorage`（键名 `wordquest-v1`）。换设备/换浏览器/清缓存会丢。设置页可以「导出 JSON」备份。

**Q：想多人共用、跨设备同步？**
当前是纯前端版本。要加账号与云端同步，需要接一个后端（方案文档 `../WordQuest-完整方案.md` 第 9-10 章已给出 Prisma 数据模型与 API 设计）。
