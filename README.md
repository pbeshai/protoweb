# Protoweb

Quickly setup a web prototype and do development with hot-reloading. Transpilation with source maps via [Buble](https://buble.surge.sh/). SASS support. Uses bootstrap reset as a base. Includes D3. Includes eslint configuration and EditorConfig.

Inspired by [blockup](https://github.com/gabrielflorit/blockup) and [hot-server](https://github.com/1wheel/hot-server/).


## Installation

```
yarn global add protoweb
-- OR --
npm install -g protoweb
```

## Running

```
protoweb
```

Run in an empty directory and it will create a new project from a template.

Run in a non-empty directory and it will run a web server with hot reloading, JS transpilation and SCSS compilation.


```
Usage: protoweb <command>

Commands:
  protoweb new    scaffold and serve a new prototype (default if directory is
                  empty)
  protoweb serve  serve current prototype (default if directory is not empty)

Options:
  --port       The port the web server uses             [number] [default: 3000]
  --transpile  Enable javascript transpilation         [boolean] [default: true]
  --hot        Enable javascript hot reloading         [boolean] [default: true]
  --d3         Include d3 as an external script during creation
                                                       [boolean] [default: true]
  --sass       Enable sass compilation                 [boolean] [default: true]
  -h, --help   Show help                                               [boolean]
  --version    Show version number                                     [boolean]
```

### Sample Usage

*In an empty directory...*

**Create a project in current directory with defaults**

```
protoweb
```

**Create a project without transpilation or Sass**

```
protoweb --sass=false --transpile=false
```

*Create a project and have the initial run work without hot reloading*

```
protoweb --hot=false
```


*After creating your initial prototype...*

**Run web server without hot reloading and without tranpsilation**

```
protoweb --hot=false --transpile=false
```


**Run web server on different port**

```
protoweb --port=8080
```
