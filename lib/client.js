window.__ModuleLoader__.load({
	id: "dsh-provider-visibility",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.tsx
		const NS = "provider-visibility";
		/** 所有自定义提供方所在的 settings 命名空间（provider-card 插槽按 settingsNs 分发）。 */
		const LLM_NS = "llm-pi-ai";
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.settings",
			"modelDirectories"
		];
		function hiddenSetFromView(view) {
			const providers = ((view?.namespaces?.find((v) => v?.ns === LLM_NS))?.value)?.providers;
			if (!providers || typeof providers !== "object") return /* @__PURE__ */ new Set();
			return new Set(Object.keys(providers).filter((id) => {
				const p = providers[id];
				return p !== null && typeof p === "object" && p.pickerHidden === true;
			}));
		}
		/** 从 remote describe 的各种返回形态里提取带 namespaces 的视图。 */
		function pickView(raw) {
			if (!raw || typeof raw !== "object") return void 0;
			const v = raw;
			if (Array.isArray(v.namespaces)) return v;
			if (v.view && Array.isArray(v.view.namespaces)) return v.view;
			if (v.value && Array.isArray(v.value.namespaces)) return v.value;
		}
		/**
		* 0.1.x 的 settingsScope.describe() 返回带响应式 store 的镜像；0.2.x 里该
		* service 已删除，改用 remote.settings.describe() 拉取 + settings/document-updated
		* 推送刷新，自建一个接口兼容的 mirror（{ store: {getSnapshot, subscribe}, ensure }），
		* 组件侧的 useSyncExternalStore 用法保持不变。
		*/
		function createSettingsMirror(ctx) {
			let view;
			const listeners = /* @__PURE__ */ new Set();
			const store = {
				getSnapshot: () => view,
				subscribe: (cb) => {
					listeners.add(cb);
					return () => {
						listeners.delete(cb);
					};
				}
			};
			const refresh = async () => {
				try {
					const raw = await ctx.remote.settings.describe();
					const next = pickView(raw?.ok ? raw.value : raw);
					if (next !== view) {
						view = next;
						for (const cb of listeners) cb();
					}
				} catch (error) {
					console.warn("[provider-visibility] settings describe failed:", error);
				}
			};
			const mirror = {
				store,
				ensure: () => refresh()
			};
			ctx.effect(() => {
				refresh();
				return ctx.on("settings/document-updated", (() => {
					refresh();
				}));
			}, "provider-visibility: settings mirror");
			return mirror;
		}
		function CapsuleSwitch({ on, pending, onToggle }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "switch",
				"aria-checked": on,
				disabled: pending,
				onClick: onToggle,
				style: {
					width: 28,
					height: 16,
					borderRadius: 999,
					border: "none",
					padding: 0,
					position: "relative",
					flex: "0 0 auto",
					background: on ? "var(--dsw-alias-state-success-primary, #22c55e)" : "var(--dsw-alias-bg-overlay, rgba(128,128,128,.45))",
					cursor: pending ? "wait" : "pointer",
					transition: "background .18s ease",
					display: "inline-block",
					verticalAlign: "middle"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
					position: "absolute",
					top: 2,
					left: 2,
					width: 12,
					height: 12,
					borderRadius: "50%",
					background: "#fff",
					boxShadow: "0 1px 2px rgba(0,0,0,.35)",
					transform: on ? "translateX(12px)" : "translateX(0)",
					transition: "transform .18s ease",
					display: "block"
				} })
			});
		}
		function ProviderVisibilityToggle({ provider, face, mutate, t }) {
			const getSnapshot = (0, react.useCallback)(() => face.store.getSnapshot(), [face]);
			const subscribe = (0, react.useCallback)((cb) => face.store.subscribe(cb), [face]);
			const hidden = hiddenSetFromView((0, react.useSyncExternalStore)(subscribe, getSnapshot)?.view).has(provider.provider);
			const [pending, setPending] = react.default.useState(false);
			const toggle = (0, react.useCallback)(async () => {
				if (pending) return;
				const path = [...provider.settingsPath ?? []];
				if (path.length === 0) return;
				setPending(true);
				try {
					const op = hidden ? {
						op: "unset",
						path: [...path, "pickerHidden"]
					} : {
						op: "set",
						path: [...path, "pickerHidden"],
						value: true
					};
					const res = await mutate(provider.settingsNs, [op]);
					if (res && res.ok === false) console.warn("[provider-visibility] write refused:", res.error?.message);
				} catch (error) {
					console.warn("[provider-visibility] write failed:", error);
				} finally {
					setPending(false);
				}
			}, [
				hidden,
				mutate,
				pending,
				provider
			]);
			const rootRef = react.default.useRef(null);
			(0, react.useLayoutEffect)(() => {
				const node = rootRef.current;
				if (!node) return;
				let host = node.parentElement;
				let editBtn;
				while (host) {
					editBtn = [...host.querySelectorAll("button")].find((b) => /^(Edit|编辑)$/.test((b.textContent || "").trim()));
					if (editBtn) break;
					host = host.parentElement;
				}
				const actions = editBtn?.parentElement;
				if (!actions || actions === node.parentElement) return;
				actions.insertBefore(node, editBtn);
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 6,
					marginRight: 2
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CapsuleSwitch, {
					on: hidden,
					pending,
					onToggle: () => void toggle()
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					title: t("tooltip"),
					style: {
						fontSize: 12,
						color: "var(--dsw-alias-label-tertiary, #999)",
						userSelect: "none",
						whiteSpace: "nowrap"
					},
					children: t("label")
				})]
			});
		}
		/**
		* 包装共享 modelCatalog 的 load：把宿主返回的 groups 按 pickerHidden 过滤后
		* 写回 catalog store。/model 弹窗与输入框模型座都从这份数据派生，一处生效。
		* settings/document-updated 推送会触发 catalog.refresh()，勾选即时生效。
		*/
		function wrapCatalogFilter(ctx, modelDirectories) {
			const catalog = modelDirectories?.catalog;
			if (!catalog || typeof catalog.load !== "function" || catalog.__pvWrapped) return;
			catalog.__pvWrapped = true;
			const store = catalog.store;
			const origLoad = catalog.load.bind(catalog);
			catalog.load = async (...args) => {
				const value = await origLoad(...args);
				try {
					const snap = store.getSnapshot();
					if (snap?.status === "ready" && snap.value && Array.isArray(snap.value.groups)) {
						const described = await ctx.remote.settings.describe();
						const hidden = described?.ok ? hiddenSetFromView(described.value) : /* @__PURE__ */ new Set();
						if (hidden.size > 0) {
							const groups = snap.value.groups.filter((g) => !hidden.has(g?.id));
							if (groups.length !== snap.value.groups.length) {
								const filtered = {
									...snap.value,
									groups
								};
								store.set({
									value: filtered,
									status: "ready",
									error: null
								});
								return filtered;
							}
						}
					}
				} catch (error) {
					console.warn("[provider-visibility] filter failed:", error);
				}
				return value;
			};
		}
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh: {
					label: "对话框隐藏",
					tooltip: "打开后，该提供方的模型不出现在对话框的模型选择列表里"
				},
				en: {
					label: "Hide in chat",
					tooltip: "Hide this provider's models from the chat model picker"
				}
			}), "provider-visibility: locale");
			const mirror = createSettingsMirror(ctx);
			mirror.ensure?.();
			const mutate = (ns, ops) => ctx.remote.settings.mutate(ns, ops, void 0);
			const modelDirectories = ctx.modelDirectories;
			if (modelDirectories?.catalog) wrapCatalogFilter(ctx, modelDirectories);
			else console.warn("[provider-visibility] modelDirectories unavailable — picker filter disabled");
			ctx.slots.inject("settings.models.provider-card", () => ctx.slots.register({
				name: "settings.models.provider-card",
				key: LLM_NS,
				priority: 50,
				locale: NS,
				registrant: "provider-visibility",
				inject: () => ({
					face: mirror,
					mutate,
					t: ctx.locale.bind(NS)
				})
			}, ProviderVisibilityToggle));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map