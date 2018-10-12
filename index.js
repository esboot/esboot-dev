#!/usr/bin/env node

const Watcher = require('./watch');

const USAGE_DOCS = `Usage:
npx esboot-dev

Options:
  -h  Show help
  -v  Show version
`;

function getPkgVersion() {
  const pkg = require('./package.json');
  return pkg.version;
}

async function run() {
  let args = process.argv.slice(2);

  const help = args.indexOf('--help') >= 0 || args.indexOf('-h') >= 0;
  const info = args.indexOf('--version') >= 0 || args.indexOf('-v') >= 0;

  args = args.filter(a => a[0] !== '-');

  if (info) {
    console.log(`esboot-dev v${getPkgVersion()} \n`);
    return 0;
  }

  if (help) {
    console.log(USAGE_DOCS);
    return 0;
  }
  new Watcher().start();
}

run();
