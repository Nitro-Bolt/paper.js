/*
 * Paper.js build tasks for Node.js 20 and Gulp 4.
 */

const fs = require('fs');
const gulp = require('gulp');
const jshint = require('gulp-jshint');
const prepro = require('gulp-prepro');
const rename = require('gulp-rename');
const terser = require('gulp-terser');
const uncomment = require('gulp-uncomment');
const whitespace = require('gulp-whitespace');
const options = require('./gulp/utils/options.js');

const buildOptions = {
    full: {paperScript: true},
    core: {paperScript: false}
};

const terserOptions = {
    format: {
        ascii_only: true,
        comments: /^!/
    }
};

const remove = paths => Promise.all(paths.map(path =>
    fs.promises.rm(path, {force: true, recursive: true})
));

const minifyAcorn = () => {
    const minifiedPath = 'node_modules/acorn/acorn.min.js';
    if (fs.existsSync(minifiedPath)) return Promise.resolve();
    return gulp.src('node_modules/acorn/acorn.js')
        .pipe(terser(terserOptions))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('node_modules/acorn'));
};

const cleanBuild = name => () => remove([
    `dist/paper-${name}.js`,
    `dist/paper-${name}.min.js`
]);

const compile = name => () => gulp.src('src/paper.js')
    .pipe(prepro({
        evaluate: ['src/constants.js'],
        setup: () => ({
            __options: Object.assign({}, options, buildOptions[name])
        })
    }))
    .pipe(uncomment({mergeEmptyLines: true}))
    .pipe(whitespace({
        spacesToTabs: 4,
        removeTrailing: true
    }))
    .pipe(rename({suffix: `-${name}`}))
    .pipe(gulp.dest('dist'));

const copyNodeFiles = () => gulp.src('src/node/*.js')
    .pipe(gulp.dest('dist/node'));

const buildFull = gulp.series(cleanBuild('full'), compile('full'));
const buildCore = gulp.series(cleanBuild('core'), compile('core'));
const build = gulp.series(minifyAcorn, gulp.parallel(buildFull, buildCore, copyNodeFiles));

const minify = () => gulp.src([
    'dist/paper-full.js',
    'dist/paper-core.js'
])
    .pipe(terser(terserOptions))
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('dist'));

const lint = () => gulp.src('src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));

const watchSources = () => gulp.watch('src/**/*.js', lint);

gulp.task('build:full', gulp.series(minifyAcorn, buildFull));
gulp.task('build:core', gulp.series(minifyAcorn, buildCore));
gulp.task('build:copy', copyNodeFiles);
gulp.task('build', build);
gulp.task('minify:acorn', minifyAcorn);
gulp.task('minify', gulp.series(build, minify));
gulp.task('dist', gulp.series(build, minify));
gulp.task('jshint', lint);
gulp.task('test', gulp.series(build, lint));
gulp.task('watch', watchSources);
gulp.task('default', gulp.series(build, minify));

exports.build = build;
exports.dist = gulp.series(build, minify);
exports.test = gulp.series(build, lint);
