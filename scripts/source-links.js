const catalog = require('../articles.json');
hexo.extend.filter.register('after_render:html', function(html) {
  for (const article of catalog) {
    const local = '/read/' + article.slug + '/';
    html = html.split('href="' + local + '"').join('href="' + article.url + '"');
  }
  return html;
});
