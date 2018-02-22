const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const format = require('string-template');

const thirdParty = {
  d3: 'https://d3js.org/d3.v5.min.js',
};

function createNewPrototype(options) {
  const { transpile, sass, includeD3 } = options;

  // interpolate strings in the index.html file
  const projectName = path.basename(process.cwd());

  // exclude d3 or include it only as an option.
  const includes = [];
  if (includeD3) {
    includes.push(thirdParty.d3);
  }
  const thirdPartyScripts = includes
    .map(d => `<script src="${d}"></script>`)
    .join('\n    ');

  console.log(chalk.cyan(`Creating a new prototype ${projectName}...`));

  // Copy files to destination directory.
  fs.copySync(path.join(__dirname, '../template'), process.cwd());

  const indexFile = path.join(process.cwd(), '/index.html');
  const indexFileContents = fs.readFileSync(indexFile, 'utf8');

  const jsPrefix = transpile ? 'dist_' : '';
  const cssPrefix = sass ? 'dist_' : '';

  const formattedIndex = format(indexFileContents, {
    projectName,
    thirdPartyScripts,
    jsPrefix,
    cssPrefix,
  });
  fs.writeFileSync(indexFile, formattedIndex, 'utf8');

  // if transpile is disabled, remove the transpiled file
  if (!transpile) {
    fs.removeSync(path.join(process.cwd(), '/dist_script.js'));
  }

  // if sass is disabled, remove the compiled css file and rename main.scss to main.css
  if (!sass) {
    fs.removeSync(path.join(process.cwd(), '/dist_main.css'));
    fs.moveSync(
      path.join(process.cwd(), '/main.scss'),
      path.join(process.cwd(), '/main.css')
    );
  }

  console.log(
    chalk.cyan(`Successfully initialized prototype in ${process.cwd()}.`)
  );
}

module.exports = createNewPrototype;
