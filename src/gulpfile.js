const gulp = require('gulp');
const concat = require('gulp-concat');

const jsSrcs = [
  './modules/*.js',
  './index.js',
];

const concatjs = () => {
  return gulp.src(jsSrcs)
  .pipe(concat('mario.js'))
  .pipe(gulp.dest('dist/'));
}

const watch = () => {
  gulp.watch(jsSrcs, concatjs)
}

exports.concatjs = concatjs;
exports.watch = watch;
