"use strict";

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: ".jshintrc"
      },
      gruntfile: {
        src: "Gruntfile.js"
      },
      src: {
        src: "relaxed-json.js"
      },
      webcli: {
        src: "web/cli.js",
        options: {
          browser: true,
          node: false,
        },
      },
    },
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks("grunt-contrib-jshint");

  // Default task.
  grunt.registerTask("default", ["jshint"]);
};
