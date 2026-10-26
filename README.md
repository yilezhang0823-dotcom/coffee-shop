# 山间咖啡 Shanjian Coffee — 官网模板

一个纯静态的咖啡店官网：`index.html` + `style.css` + `script.js`，不依赖任何框架、构建工具、外链字体或图片。双击 `index.html` 即可在浏览器中打开；上传到任意静态空间（如对象存储、虚拟主机）即可上线。

## 页面结构

| 区块 | 位置（index.html 中的 id） |
|---|---|
| 顶部导航 | `.site-header` |
| 首屏（线条咖啡杯 + 热气动画） | `#home` |
| 菜单（咖啡 / 茶饮 / 甜点） | `#menu` |
| 关于我们 | `#about` |
| 营业信息（地址、营业时间、联系） | `#visit` |
| 预约座位（深色区块） | `#reserve` |
| 页脚 | `.site-footer` |

## 常见修改

### 1. 店名

在 `index.html` 中全局搜索替换：

- `山间咖啡` → 新的中文店名（导航、首屏标题、页脚、`<title>`）
- `SHANJIAN COFFEE` / `Shanjian Coffee` → 新的英文名

首屏标题是逐字动画，每个字是一个 `<span class="char" style="--i:序号">`。店名字数变化时，按字增删 `<span>`，`--i` 从 0 依次递增；外层的 `aria-label` 也改成新店名（读屏软件读的是它）。

### 2. 地址、电话、邮箱

都在 `#visit` 区块里：

- 地址：`<address class="visit__address">`
- 交通提示：下面的 `<p class="visit__hint">`
- 电话：`href="tel:..."` 和显示的号码两处都要改
- 邮箱：`href="mailto:..."` 和显示的文字两处都要改
- 微信号：`contact-list` 第三项

### 3. 营业时间

只改 `#visit` 里的表格即可，页面上的"今天"高亮、"营业中 / 已打烊"状态和预约表单的时间校验都从这张表读取：

```html
<tr data-day="1" data-open="08:00" data-close="20:00"><th scope="row">周一</th><td class="mono">08:00 – 20:00</td></tr>
<tr data-day="3" data-closed><th scope="row">周三</th><td>店休 · 烘豆日</td></tr>
```

- `data-day`：0 = 周日，1 = 周一 … 6 = 周六
- `data-open` / `data-close`：24 小时制 `HH:MM`；显示文字（`<td>`）请同步修改
- 店休日：去掉 `data-open` / `data-close`，加上 `data-closed`
- 预约区的说明文字"周三店休"也记得一起改（`.reserve__notes`）

预约规则在 `script.js` 顶部附近的三个常量里：

```js
var MAX_DAYS_AHEAD = 30;          // 可预约多少天内
var LAST_ORDER_BEFORE_CLOSE = 60; // 打烊前多少分钟停止接受到店
var MIN_LEAD_MINUTES = 30;        // 当天预约至少提前多少分钟
```

### 4. 菜单和价格

每个分类是一个 `tabs__panel`（`#panel-coffee`、`#panel-tea`、`#panel-dessert`），每一项的结构如下，复制一整段 `<li>` 即可新增：

```html
<li class="menu-item">
  <div class="menu-item__row">
    <span class="menu-item__no mono">C01</span>           <!-- 编号 -->
    <h3 class="menu-item__name">耶加雪菲 · 手冲</h3>      <!-- 名称 -->
    <span class="menu-item__dots" aria-hidden="true"></span>
    <span class="menu-item__price mono"><span class="visually-hidden">价格</span>¥38</span>  <!-- 价格 -->
  </div>
  <p class="menu-item__desc">产地 · 处理法 · 烘焙度。风味描述……</p>  <!-- 描述 -->
</li>
```

点状引导线会自动填满名称和价格之间的空隙，不需要手动调整。

新增分类：在 `.tabs__list` 里复制一个 `<button role="tab">`，再复制一个对应的 `tabs__panel`，并把按钮的 `id` / `aria-controls` 和面板的 `id` / `aria-labelledby` 对应起来。非默认分类的按钮带 `aria-selected="false" tabindex="-1"`，面板带 `hidden`。

### 5. 颜色、字体、间距

全部在 `style.css` 顶部的 `:root` 变量里：

- 颜色：`--cream`（底色）、`--ink`（文字）、`--caramel`（强调色）、`--espresso`（深色区块）等。`--caramel-ink` 是用于小号文字的深一档焦糖色，修改时请保证它在底色上的对比度不低于 4.5 : 1。
- 字体：`--font-serif`（标题）、`--font-sans`（正文）、`--font-mono`（编号、价格）
- 间距：`--s-1` ~ `--s-7`，对应 4 / 8 / 16 / 24 / 40 / 64 / 96 px
- 圆角 `--radius`、动效时长 `--dur-*` 与缓动 `--ease`

### 6. 店铺故事与插画

- 文字在 `#about` 的 `.prose` 里，署名在 `.signature`
- 插画是内联 SVG（山、太阳、咖啡豆），可直接修改 `<svg>` 中的路径；图中的经纬度和海拔文字也是虚构的，记得一起改

## 预约表单说明

表单只做前端演示：校验必填项、手机号格式（11 位大陆手机号）、日期不早于今天且在可预约范围内、店休日、到店时间在营业时间内。提交后切换为确认卡片，**不会发送任何数据**。

如需真正接收预约，可以在 `script.js` 的 `form.addEventListener('submit', …)` 里，校验通过后把数据提交到自己的后端或表单服务，再显示确认卡片。

## 无障碍与兼容

- 支持键盘操作：Tab 切换焦点，菜单分类标签可用 ← → Home End 切换，移动端导航可用 Esc 关闭
- 系统开启"减少动态效果"时，热气、旋转文字、入场和滚动动画都会关闭
- 适配电脑、平板、手机（最窄 320px），不会出现横向滚动
- 建议使用较新版本的 Chrome、Edge、Safari、Firefox 浏览
