const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sass = require('sass');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src/components/card-packs');
const modules = {};
function load(name) {
    if(name === 'react') return React;
    if(!['./CardPackGeometry', './CardPackDesign', './CardPackOpeningView'].includes(name)) return {};
    if(modules[name]) return modules[name];
    const file = path.join(sourceRoot, name.slice(2) + (name.endsWith('View') ? '.tsx' : '.ts'));
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2019 }
    }).outputText;
    const exports = {};
    modules[name] = exports;
    new Function('require', 'exports', 'React', code)(load, exports, React);
    return exports;
}

const { CARD_PACK_DESIGNS } = load('./CardPackDesign');
const { renderPackageArtwork } = load('./CardPackOpeningView');
const css = sass.renderSync({ file: path.join(sourceRoot, 'CardPackOpeningView.scss') }).css.toString();
const artworkCss = (css.match(/[^{}]+\{[^{}]*\}/g) || []).filter(rule => /card-pack-master|card-pack-thumbnail|card-pack-sealed-perforation/.test(rule)).join('\n');
const output = path.join(root, 'public/card-packs');
fs.mkdirSync(output, { recursive: true });

for(const design of Object.values(CARD_PACK_DESIGNS)) {
    const svg = React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 205 285', width: 205, height: 285, className: 'card-pack-thumbnail', style: design.style },
        React.createElement('style', null, artworkCss + '\n.card-pack-thumbnail{font-family:"Ubuntu Condensed",Tahoma,sans-serif}.card-pack-thumbnail path{vector-effect:none}'),
        renderPackageArtwork('thumbnail-' + design.key, 0, 'right-to-left', design),
        React.createElement('path', { className: 'card-pack-sealed-perforation', d: 'M 11 43 H 194' }));
    fs.writeFileSync(path.join(output, design.key + '.svg'), renderToStaticMarkup(svg) + '\n');
    console.log('Generated card-pack thumbnail: ' + design.key + '.svg');
}
