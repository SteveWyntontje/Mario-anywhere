const { src, dest } = require('gulp');
const concat = require('gulp-concat');

const concatjs = () => {
  return src([
    'test-src/file-a.js',
    'test-src/file-b.js',
  ])
  .pipe(concat('script-concat.js'))
  .pipe(dest('dist/js'));
}

exports.concatjs = concatjs;
