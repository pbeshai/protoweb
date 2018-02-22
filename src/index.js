#!/usr/bin/env node

const fs = require('fs');
const chalk = require('chalk');

const hotServer = require('./hotServer');
const createNewPrototype = require('./createNewPrototype');

const argv = require('yargs')
  .usage('Usage: $0 <command>')
  .command(
    'new',
    'scaffold and serve a new prototype (default if directory is empty)'
  )
  .command(
    'serve',
    'serve current prototype (default if directory is not empty)'
  )
  .option('port')
  .describe('port', 'The port the web server uses')
  .number('port')
  .default('port', 3000)
  .option('transpile')
  .describe('transpile', 'Enable javascript transpilation')
  .boolean('transpile')
  .default('transpile', true)
  .option('d3')
  .describe('d3', 'Include d3 as an external script during creation')
  .boolean('d3')
  .default('d3', true)
  .describe('sass', 'Enable sass compilation')
  .boolean('sass')
  .default('sass', true)
  .help('h')
  .alias('h', 'help')
  .version().argv;

function main(argv) {
  let command = argv._[0];
  const { port, transpile, d3: includeD3, sass } = argv;

  // if no command is provided, run either new or serve depending on
  // whether the current directory is empty.
  if (command == null) {
    if (fs.readdirSync(process.cwd(), { encoding: 'utf8' }).length) {
      command = 'serve';
    } else {
      command = 'new';
    }
  }

  switch (command) {
    // Create a new block and start the dev server
    case 'new': {
      createNewPrototype({ transpile, includeD3, sass });
      hotServer({ port, transpile, sass });
      break;
    }

    // Start the dev server
    case 'serve': {
      hotServer({ port, transpile });
      break;
    }
    default:
      console.log(chalk.red(`Unsupported command '${command}'`));

      break;
  }
}

main(argv);
