const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');
const release = process.argv.includes('--release');
const chartSource = path.join(__dirname, 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js');
const chartDestination = path.join(__dirname, 'media', 'chart.umd.min.js');
const packageVersion = require('./package.json').version;

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: !release,
  minify: false,
  define: {
    __EXTENSION_VERSION__: JSON.stringify(packageVersion),
  },
};

function copyChart() {
  if (!fs.existsSync(chartSource)) {
    throw new Error('Chart.js is missing. Run npm install before building.');
  }
  fs.mkdirSync(path.dirname(chartDestination), { recursive: true });
  fs.copyFileSync(chartSource, chartDestination);
}

async function main() {
  copyChart();
  if (watch) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log('Watching...');
    return;
  }

  await esbuild.build(buildOptions);
  if (release) {
    fs.rmSync(path.join(__dirname, 'dist', 'extension.js.map'), { force: true });
  }
  console.log('Build complete');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
