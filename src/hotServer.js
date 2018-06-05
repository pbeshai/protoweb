#!/usr/bin/env node
/**
 * From https://github.com/1wheel/hot-server/blob/master/index.js
 */

const express = require('express');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
const WebSocket = require('ws');
const fs = require('fs');
const chokidar = require('chokidar');
const child = require('child_process');
const chalk = require('chalk');
const buble = require('buble');
const path = require('path');
const sass = require('node-sass');

// append websocket/injecter script to all html pages served
const wsInject = fs.readFileSync(__dirname + '/ws-inject.html', 'utf8');
function injectHTML(req, res, next) {
  try {
    let path = req.params[0].slice(1);
    if (path.slice(-1) === '/') {
      path = path + '/index.html';
    }
    if (path === '') {
      path = 'index.html';
    }
    if (path.slice(-5) !== '.html') {
      return next();
    }

    const html = fs.readFileSync(path, 'utf-8') + wsInject;
    res.send(html);
  } catch (e) {
    next();
  }
}

// use buble to transpile JS
function transpileJavascript(filePath, fileContents) {
  console.log(chalk.gray(`> Transpiling ${filePath}...`));
  try {
    const fileBasename = path.basename(filePath, '.js');
    const outputFilename = `dist_${fileBasename}.js`;
    const outputFilePath = `${path.dirname(filePath)}/${outputFilename}`;

    const transpiled = buble.transform(fileContents, {
      transforms: { dangerousForOf: true },
      file: outputFilename,
      // need unique ID so dev tools knows its a new source and to refresh
      source: `${fileBasename}.js-${Date.now()}`,
    });

    const outputWithSourceMap = `${
      transpiled.code
    }\n//# sourceMappingURL=${transpiled.map.toUrl()}`;

    // write to disk
    fs.writeFileSync(outputFilePath, outputWithSourceMap, 'utf8');

    return outputWithSourceMap;
  } catch (e) {
    console.log(
      chalk.red(`! Error during javascript transpilation of ${filePath}:`)
    );
    console.log(e.snippet);

    throw e;
  }
}

// compile SASS to CSS
function compileSass(filePath, fileContents) {
  console.log(chalk.gray(`> Compiling Sass ${filePath}...`));
  try {
    const fileBasename = path.basename(filePath, '.scss');
    const outputFilename = `dist_${fileBasename}.css`;
    const outputFilePath = `${path.dirname(filePath)}/${outputFilename}`;

    const compiledCss = sass.renderSync({
      file: filePath,
      outFile: outputFilename,
      // source: `${fileBasename}.scss-${Date.now()}`,
      sourceMap: true,
      sourceMapContents: true,
      sourceMapEmbed: true,
    });

    // write to disk
    fs.writeFileSync(outputFilePath, compiledCss.css, 'utf8');

    return compiledCss;
  } catch (e) {
    console.log(chalk.red(`! Error during Sass compilation of ${filePath}:`));
    console.log(e);

    throw e;
  }
}

// set up express static server with a websocket
function hotServer(options) {
  let { port = 3000, transpile = true, hot = true } = options;

  console.log(
    chalk.gray(`\nInitializing web server at `) +
      chalk.cyan(`http://localhost:${port}`) +
      chalk.gray('...')
  );
  console.log(
    chalk.gray(`JS transpilation is `) +
      (transpile ? chalk.green('enabled') : chalk.red('disabled')) +
      chalk.gray('.')
  );
  console.log(
    chalk.gray(`JS hot reloading is `) +
      (hot ? chalk.green('enabled') : chalk.red('disabled')) +
      chalk.gray('.')
  );
  console.log();

  const server = express()
    .get('*', injectHTML)
    .use(serveStatic('./'))
    .use('/', serveIndex('./', { icons: true }))
    .listen(port)
    .on('listening', () => child.exec(`open http://localhost:${port}`));

  process.on(
    'uncaughtException',
    err => (err.errno === 'EADDRINUSE' ? server.listen(++port) : 0)
  ); // increment port if in use

  // if a .js or .css files changes, load and send to client via websocket
  const wss = new WebSocket.Server({ server });

  const baseDir = process.cwd();
  console.log('baseDir =', baseDir);
  chokidar
    .watch([process.cwd()], { ignored: /node_modules|\.git|[/\\]\.|^\./ })
    .on('change', filePath => {
      console.log('change on', filePath);
      try {
        // read in the file from disk
        let fileContents = fs.readFileSync(filePath, 'utf8');

        let errorOccurred = false;
        const filename = filePath.replace(baseDir, '').substring(1); // drop initial '/'
        const path = `/${filename}`;
        console.log(chalk.gray(`> Change detected at `) + chalk.green(path));

        let type = 'reload';
        if (/.js$/.test(path)) {
          type = 'jsInject';
          // transpile if set to
          if (transpile) {
            // write a dist_${filename} file out that the app should use, unless this is one
            if (filename.indexOf('dist_') !== 0) {
              try {
                fileContents = transpileJavascript(filePath, fileContents);

                // abort since the dist_ file will trigger a change
                return;
              } catch (transpilationError) {
                errorOccurred = true;
                const errorString = `
                  console.error('! Error during javascript transpilation of ${filePath}:\\n\\n' + ${JSON.stringify(
                  transpilationError.snippet
                )});`;
                fileContents = errorString;
              }
            }
          }
        } else if (/.css$/.test(path)) {
          type = 'cssInject';
        } else if (/.(scss|sass)$/.test(path)) {
          type = 'cssInject';
          fileContents = compileSass(filePath, fileContents);

          // abort since the dist_ css file will trigger a change.
          return;
        }

        if (fileContents == null) {
          console.log(chalk.red('> Aborting reload.'));
          return;
        }

        // if hot reload is disabled, force it to be a reload
        if (type === 'jsInject' && !hot) {
          type = 'reload';
        }

        if (errorOccurred) {
          console.log(chalk.red('> Sending error to browser...'));
        } else {
          if (type === 'reload' || (type === 'jsInject' && !hot)) {
            console.log(chalk.yellow('> Forcing full page reload...'));
          } else {
            console.log(chalk.magenta('> Hot reloading...'));
          }
        }

        const msg = { path, type, str: fileContents };

        wss.clients.forEach(wsClient => {
          if (wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(JSON.stringify(msg));
          }
        });
      } catch (e) {
        console.error(
          'Exception occurred handling file change in ' + filePath,
          e
        );
      }
    });

  wss.on('connection', ws => {
    console.log(chalk.gray('> Client connected.'));
    ws.on('close', () => console.log(chalk.gray('> Client disconnected')));
  });
}

module.exports = hotServer;
