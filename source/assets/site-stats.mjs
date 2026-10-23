if (window.__mosechoSiteStats) {
  window.__mosechoSiteStats.refresh();
} else {
  const refresh = () => {
    for (const node of document.querySelectorAll('[data-site-start]')) {
      const start = Date.parse(node.dataset.siteStart);
      if (Number.isFinite(start)) node.textContent = String(Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1));
    }
  };
  const attached = new WeakSet();
  const attach = (swup) => {
    if (!swup?.hooks || attached.has(swup)) return;
    attached.add(swup);
    swup.hooks.on('page:view', refresh);
  };
  window.__mosechoSiteStats = { refresh };
  refresh();
  attach(window.swup);
  window.addEventListener('redefine:swup:ready', (event) => attach(event.detail?.swup));
  document.addEventListener('visibilitychange', refresh);
  setInterval(refresh, 60000);
}
