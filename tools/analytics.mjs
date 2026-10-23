// Public tracker configuration only. Dashboard credentials never belong here.
export function analyticsHead(config) {
  if (config.provider !== 'umami') throw new Error('Unsupported analytics provider');
  if (config.scriptUrl == null && config.websiteId == null) return [];
  if (typeof config.scriptUrl !== 'string' || typeof config.websiteId !== 'string') {
    throw new Error('Analytics requires both scriptUrl and websiteId');
  }
  const script = new URL(config.scriptUrl);
  if (script.protocol !== 'https:' || script.username || script.password) {
    throw new Error('Analytics script must use HTTPS without credentials');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.websiteId)) {
    throw new Error('Analytics websiteId must be a UUID');
  }
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return [`<script defer data-swup-ignore-script src="${escape(script.href)}" data-website-id="${config.websiteId}" data-domains="mosecho.github.io"></script>`];
}
