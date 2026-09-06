const fs = require('node:fs');
const postcss = require('postcss');
const prefixSelector = require('postcss-prefix-selector');

const SRC = 'node_modules/@humansignal/editor/main.css';
const OUT = 'src/labelstudio-prefixed.css';

fs.readFile(SRC, (err, css) =>
{
  if (err) throw err;

  postcss([
    prefixSelector({
      prefix: '#ldp-label-studio-wrapper.ldp-label-studio.ldp-studio',
      transform: (prefix, selector, prefixedSelector) =>
      {
        // Skip global roots
        if (selector.startsWith(':root') || selector.startsWith('html')) return selector;
        // Always ensure leading space before prefix to avoid concatenation issues
        return `${prefix} ${selector}`;
      },
    }),
  ])
    .process(css, { from: SRC, to: OUT })
    .then(result =>
    {
      fs.writeFileSync(OUT, result.css.trimStart());
      console.log(`✅ Prefixed CSS saved to ${OUT} (${result.css.length} bytes)`);
    });
});