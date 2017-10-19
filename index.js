const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const objectHash = require('object-hash');
const webpack = require('webpack');

class WebpackExternalPlus {
  constructor() {
    this.externals = {};
    this.externalsCache = {};
    this.namespace = 'WebpackExternalPlus';
  }

  apply(compiler) {
    // analysis dependencies
    compiler.plugin('compile', (params) => {
      params.normalModuleFactory.plugin('factory', factory => (data, callback) => {
        const context = data.context;
        const dependency = data.dependencies[0];
        const absolutePath = path.resolve(data.context, dependency.request).replace(/\\/g, '/');
        const ns = `window['${this.namespace}']['${dependency.request}']`;
        dependency.request = dependency.request.replace(/\\/g, '/');

        const handleExternal = (value, callback) => {
          if (typeof value !== 'string' || value.trim() === '') {
            return factory(data, callback);
          }

          const ExternalModule = require("webpack/lib/ExternalModule");
          return callback(null, new ExternalModule(value, 'var', dependency.request));
        };

        if (!dependency.request.match(/^(\.|\/|!|webpack)/)) {
          const alias = compiler.options.resolve && compiler.options.resolve.alias || {};
          if (!alias[dependency.request.split('/')[0]]) {
            this.externals[dependency.request] = dependency.request;
            return handleExternal(ns, callback);
          }
        } else if (dependency.request.match(/^\./)) {
          if (dependency.request.match(/node_modules/)) {
            this.externals[dependency.request] = absolutePath;
            return handleExternal(ns, callback);
          }
        }

        // if (!dependency.request.match(/^!/)) {
        //  console.log('packfiles', dependency.request, absolutePath);
        // }

        return handleExternal(false, callback);
      });
    });

    // compile global
    compiler.plugin('done', (compilation) => {
      setTimeout(() => {
        console.log('\n[WEP] Compiling...');

        let vars = this.getVars(compiler.options);
        let file = this.getFileName();

        mkdirp.sync(vars.outputPath, (err) => {
          if (err) {
            throw err;
          }
        });

        let vendorPath = path.resolve(vars.outputPath, `./${file}.js`);
        if (fs.existsSync(vendorPath)) {
          console.log('[WEP] Compiled successfully.\n');
          return;
        }

        let vendorTmpl = this.getEntryTemplate();
        let vendorTmplPath = path.resolve(vars.outputPath, `./${file}.template.js`);
        fs.writeFileSync(vendorTmplPath, vendorTmpl, 'utf8');

        let options = {
          entry: {},
          output: {
            path: vars.outputPath,
            filename: '[name].js'
          },
          module: {
            loaders: [
              {
                test: /\.(gif|jpg|png|woff|eot|ttf)\??.*$/,
                loader: 'url-loader',
                query: {
                  limit: 10240,
                  name: path.normalize('./images/[name].[ext]?[hash]')
                }
              }, {
                test: /\.woff(#\w*)*$/,
                loader: 'url-loader',
                query: {
                  limit: 10240,
                  name: path.normalize('./fonts/[name].[ext]'),
                  minetype: 'application/font-woff'
                }
              }, {
                test: /\.woff2(#\w*)*$/,
                loader: 'url-loader',
                query: {
                  limit: 10240,
                  name: path.normalize('./fonts/[name].[ext]'),
                  minetype: 'application/font-woff'
                }
              }, {
                test: /\.ttf(#\w*)*$/,
                loader: 'url-loader',
                query: {
                  limit: 10240,
                  name: path.normalize('./fonts/[name].[ext]'),
                  minetype: 'application/octet-stream'
                }
              }, {
                test: /\.eot(#\w*)*$/,
                loader: 'file-loader',
                query: {
                  limit: 10240,
                  name: path.normalize('./fonts/[name].[ext]')
                }
              }, {
                test: /\.svg(#\w*)*$/,
                loader: 'url-loader',
                query: {
                  limit: 10240,
                  name: path.normalize('./fonts/[name].[ext]'),
                  minetype: 'image/svg+xml'
                }
              },
              {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
              },
              {
                test: /\.styl$/,
                loader: 'style-loader!css-loader!stylus-loader'
              },
              {
                test: /\.less$/,
                loader: "style-loader!css-loader!less-loader"
              }
            ]
          }
        };
        options.entry[file] = vendorTmplPath;
        webpack(options, (err, stats) => {
          if (err || stats.hasErrors()) {
            console.log('[WEP] Compiled failed.');
          } else {
            console.log('[WEP] Compiled successfully.\n');
          }
        });
      });
    });

    // html-webpack-plugin
    compiler.plugin('compilation', (compilation) => {
      compilation.plugin('html-webpack-plugin-before-html-processing', (htmlPluginData, callback) => {
        let vars = this.getVars(compiler.options);
        let file = this.getFileName();
        htmlPluginData.assets.js.unshift(`${vars.publicPath}${file}.js`);
        callback(null, htmlPluginData);
      });
    });
  }

  getVars(options) {
    let outputPath = options.output.path;
    const devServer = options.devServer || {};
    if (devServer.contentBase) {
      outputPath = devServer.contentBase;
    }

    let publicPath = options.output.publicPath || '';
    publicPath += publicPath.match(/\/$/) ? '' : '/';

    return {
      outputPath: outputPath,
      publicPath: publicPath
    }
  }

  getFileName() {
    let cache = {};
    let keys = Object.keys(this.externals).concat(Object.keys(this.externalsCache)).sort();
    keys.forEach((item) => {
      if (this.externalsCache[item]) {
        cache[item] = this.externalsCache[item];
      } else {
        cache[item] = this.externals[item];
      }
    });
    this.externalsCache = cache;
    let hash = objectHash(this.externalsCache);
    return `vendor.${hash}`;
  }

  getEntryTemplate() {
    const arr = [];
    arr.push(`window['${this.namespace}'] = {`);
    Object.keys(this.externals).forEach((item) => {
      arr.push(`'${item}': require('${this.externals[item]}'),`);
    });
    arr.push('}');
    return arr.join('\n');
  }
}

module.exports = WebpackExternalPlus;
