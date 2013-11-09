"use strict";

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    jshint: {
      options: {
        jshintrc: ".jshintrc",
      },
      gruntfile: {
        src: "Gruntfile.js",
      },
      src: {
        src: "relaxed-json.js",
        options: {
          node: false,
        },
      },
      test: {
        src: "test/**/*.js",
      },
      webcli: {
        src: "web.js",
        options: {
          browser: true,
          node: false,
        },
      },
    },
    simplemocha: {
      options: {
        timeout: 3000,
        ui: "bdd",
        reporter: "spec"
      },

      all: { src: "test/**/*.js" }
    },
    uglify: {
      core: {
        src: "relaxed-json.js",
        dest: "relaxed-json.min.js",
        options: {
          sourceMap: "relaxed-json.min.js.map",
          report: "min",
        },
      },
    },
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-simple-mocha");

  // Default task.
  grunt.registerTask("default", ["jshint", "simplemocha"]);
};
