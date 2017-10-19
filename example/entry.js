console.log('url', require('url'));
console.log('react', require('react'));
console.log('react-router', require('react-router'));
console.log('antd', require('antd'));
console.log('moment', require('moment'));

console.log('entry');
console.log('demo', require('components/demo'));

if (module.hot) {
  module.hot.accept();
}
