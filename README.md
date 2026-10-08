# dsh-provider-visibility

DSH（DeepSeek Harness）Web 插件：在 设置 → 模型 的每个自定义提供方卡片上加一枚**胶囊开关**（开=绿）「对话框隐藏 / Hide in chat」。打开后该提供方的模型不出现在对话框的模型选择列表（`/model` 弹窗 + 输入框模型座），关闭即恢复，秒级生效。

> **环境要求**：DSH **0.2.x**（如 `0.2.0-rc.2`）。0.2.x 移除了 client 侧 `settingsScope` service 并更名了
> `slots.register` 字段（`id`→`registrant`、`order`→`priority`），本版本已按新模型适配；不再兼容 0.1.x。

纯客户端实现，不改 DSH 任何 bundled 文件，npm 升级 DSH 不受影响。

## 原理

- **UI**：注册 `settings.models.provider-card` 官方 keyed 插槽（`key: llm-pi-ai`，一张注册覆盖全部自定义提供方卡片）；挂载后把开关节点搬进标题行右侧的 rowActions，与「编辑 / 删除」同行
- **过滤**：运行时包装 `modelDirectories.catalog.load()`，按配置过滤宿主返回的 groups；`settings/document-updated` 推送触发 `catalog.refresh()`，开关即时生效
- **数据**：`~/.dsh/settings.yaml` → `llm-pi-ai.providers.<id>.pickerHidden: true`

## 安装

```bash
# 构建已包含在 lib/（改源码后 npm install && npm run build 重新生成）
ln -sfn "$(pwd)/dsh-provider-visibility" ~/.dsh/profiles/web/node_modules/dsh-provider-visibility
```

然后在 `~/.dsh/profiles/web/package.json` 里：

1. `dependencies` 加 `"dsh-provider-visibility": "link:<本仓库绝对路径>"`
2. `dsh.profile.bundles` 数组追加 `"dsh-provider-visibility"`

重启 `dsh web` 生效。

## 已知边界

- 过滤作用于客户端所有模型选择器（含 Agent 预设的模型选择）
- 隐藏 ≠ 禁用：被隐藏的提供方仍可正常调用，只是不进选择列表

## 排障

- `cordis.patch.yml` 的 `- insert` 行不能省：client-modules 宿主半区扫描「激活的 Loader 条目」组装 `/plugins` 引导图，空 patch 会让 client.js 不被下发
- profile bundle 必须声明 `dsh.bundle.patch`，否则启动报 "declares no dsh.bundle"
