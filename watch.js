const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');
const { renderFile } = require('ejs');
const minimatch = require('minimatch');

class Watcher {

  constructor() {
    const sourcePath = process.cwd();
    const bootPath = path.join(sourcePath, 'bootstrap.js');
    this.templatePath = path.join(sourcePath, 'template');
    const mockPath = path.join(sourcePath, 'mock');
    this.destPath = path.join(mockPath, 'output');
    const inputMockPath = path.join(mockPath, 'prompt.mock.json');

    if (!fs.existsSync(bootPath) || !fs.existsSync(this.templatePath)) {
      console.log('Please run this CMD under the root directory of esboot template! (with bootstrap.js)');
      process.exit(-1);
    }

    const bootConfig = require(bootPath);
    this.templateExt = '.ejs';
    this.answer = this.initAnswer(inputMockPath, bootConfig, mockPath);
    this.copyIgnores = this.initCopyIgnores(bootConfig, this.answer);
  }

  initCopyIgnores(bootConfig, answer) {
    const l = bootConfig.ignore ? bootConfig.ignore.reduce((prev, next) => {
      prev[next] = '';
      return prev;
    }, {}) : {};

    const obj = { ...bootConfig.filter, ...l };
    for (let key in obj) {
      const v = obj[key];
      if (answer.hasOwnProperty(v) && answer[v]) delete obj[key];
    }
    return Object.keys(obj)
  }

  initAnswer(inputMockPath, bootConfig, mockPath) {
    let answer = {};
    if (fs.existsSync(inputMockPath)) {
      answer = fs.readJSONSync(inputMockPath);
    } else {
      if (bootConfig.hasOwnProperty('prompt')) {
        answer = bootConfig.prompt.reduce((prev, curr) => {
          prev[curr.name] = curr.default;
          return prev
        }, {});
        fs.ensureDir(mockPath);
        fs.writeJSONSync(inputMockPath, answer);
      }
    }
    console.log('load prompt config', answer);
    return answer;
  }

  isCopyExclude(p) {
    for (let i of this.copyIgnores) {
      if (minimatch(p, i, { dot: true })) return true
    }
    return false;
  }

  copy(from, to) {
    fs.copySync(from, to);
  }

  copyTpl(from, to) {
    renderFile(from, this.answer, (err, rs) => {
      if (err) throw err;
      fs.writeFileSync(to.replace(this.templateExt, ''), rs, 'utf8');
    })
  }

  copyFile(from, to) {
    from.endsWith(this.templateExt) ? this.copyTpl(from, to) : this.copy(from, to);
  }

  start() {
    fs.emptyDirSync(this.destPath);

    const watcher = chokidar.watch(this.templatePath);
    console.log('start watch', this.templatePath, '...');
    watcher.on('all', (event, fullPath) => {
      const relativeTemplatePath = path.relative(this.templatePath, fullPath);
      const destPath = path.join(this.destPath, relativeTemplatePath);
      // console.log(event, relativeTemplatePath);

      if (event === 'add' || event === 'change') {
        if (this.isCopyExclude(relativeTemplatePath)) return;
        fs.ensureDirSync(path.dirname(destPath));
        this.copyFile(fullPath, destPath);
        console.log(event, relativeTemplatePath);
        return;
      }

      if (event === 'unlink' || event === 'unlinkDir') {
        console.log(event, relativeTemplatePath);
        fs.removeSync(destPath);
      }
    });
  }
}

module.exports = Watcher;


