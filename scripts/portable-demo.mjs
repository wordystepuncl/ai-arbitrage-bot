import { readFile, writeFile } from 'node:fs/promises';

function dataUrl(type, content) {
  return `data:${type};base64,${Buffer.from(content).toString('base64')}`;
}

function replaceRequired(text, pattern, replacement) {
  if (!pattern.test(text)) throw new Error(`Missing standalone demo input: ${pattern}`);
  return text.replace(pattern, replacement);
}

export async function writePortableDemo(root) {
  const read = (name) => readFile(new URL(`dist/client/${name}`, root), 'utf8');
  const [page, styles, favicon, app] = await Promise.all([
    read('index.html'), read('styles.css'), read('favicon.svg'), read('app.js'),
  ]);

  // The app uses static named imports from local modules with no dependencies of their own.
  const importLine = /^import\s+\{([^{}]+)\}\s+from\s+'\.\/([a-z]+\.js)';[^\S\r\n]*\r?\n/gm;
  const modules = await Promise.all([...app.matchAll(importLine)].map(async ([, names, file]) => {
    const source = (await read(file)).replace(/^export (?=const |(?:async )?function )/gm, '');
    if (/^(?:import|export)\s/m.test(source)) throw new Error(`Unsupported module declaration in ${file}`);
    const bindings = names.split(',').map((name) => name.trim()).join(', ');
    return `const { ${bindings} } = (() => {\n${source}\nreturn { ${bindings} };\n})();`;
  }));
  const entry = app.replace(importLine, '');
  if (modules.length === 0 || /^(?:import|export)\s/m.test(entry)) {
    throw new Error('Unsupported app module declaration');
  }
  const script = `'use strict';\n(() => {\n${modules.join('\n')}\n${entry}\n})();`;
  if (/<\/script/i.test(script) || /<\/style/i.test(styles)) {
    throw new Error('Cannot inline HTML closing tags in the portable demo');
  }

  let html = replaceRequired(page, /<link rel="stylesheet" href="\.\/styles\.css">/, () => `<style>\n${styles}\n</style>`);
  html = replaceRequired(html, /href="\.\/favicon\.svg"/, () => `href="${dataUrl('image/svg+xml', favicon)}"`);
  html = replaceRequired(html, /href="\.\/"/, () => 'href="#top"');
  html = replaceRequired(html, /<script type="module" src="\.\/app\.js"><\/script>/, () => `<script>\n${script}\n</script>`);
  await writeFile(new URL('DEMO.html', root), html);
}
