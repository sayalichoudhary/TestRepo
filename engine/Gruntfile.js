/**
 * Creates grunt task for running server side mocha test
 * Created by API Defender on 01/04/2016
 * @version 1.0
 */


'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        
        mochaTest: {
            src: ['test/**/*Test.js'],
            options: {
                globals: ['assert'],
                ignoreLeaks: true,
                ui: 'bdd',
                reporter: 'spec'
            }
        }
    });

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.registerTask('test', ['mochaTest']);
    // grunt.registerTask('codecoverage', ['coverage']);

};