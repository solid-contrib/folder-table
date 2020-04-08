
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = [{
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'foldertable.bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/index.html' })
  ],
  externals: {
    fs: 'null',
    'node-fetch': 'fetch',
    'isomorphic-fetch': 'fetch',
    xmldom: 'window',
    'text-encoding': 'TextEncoder',
    'whatwg-url': 'window',
    '@trust/webcrypto': 'crypto'
  },
  devServer: {
    contentBase: './dist'
  },
  devtool: 'source-map'
},
{
  mode: 'development',
  entry: './src/folderTable.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'folderTable.js'
  },
  externals: {
    fs: 'null',
    'node-fetch': 'fetch',
    'isomorphic-fetch': 'fetch',
    xmldom: 'window',
    'text-encoding': 'TextEncoder',
    'whatwg-url': 'window',
    '@trust/webcrypto': 'crypto'
  },
  devtool: 'source-map'
}]
