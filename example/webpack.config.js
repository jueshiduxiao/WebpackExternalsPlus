const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackExternalsPlusPlugin = require('webpack-externals-plus-plugin');
//const WebpackExternalsPlusPlugin = require('../index.js');
const webpack = require('webpack');
const path = require('path');
const root = __dirname;


module.exports = {
  entry: {
    entry: `${root}/entry.js`
  },
  output: {
    path: `${root}/dist/`,
    filename: '[name].js'
  },
  resolve: {
    alias: {
      components: path.resolve(root, './src/components')
    }
  },
  devServer: {
    contentBase: `${root}/dist/`
  },
  plugins: [
    new WebpackExternalsPlusPlugin(),
    new HtmlWebpackPlugin()
  ]
};
