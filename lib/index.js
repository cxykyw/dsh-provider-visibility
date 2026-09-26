/**
 * dsh-provider-visibility — host half.
 *
 * 纯客户端插件：所有功能（provider-card 胶囊开关 + 模型列表过滤）都在
 * lib/client.js 里完成。这里只提供 cordis 要求的最小宿主入口，
 * 因为 cordis.patch.yml 的 insert 行会在宿主配置树实例化本包。
 */
export const inject = []

export function apply() {
  /* no-op：本插件没有服务端行为 */
}
