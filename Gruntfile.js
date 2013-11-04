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
      web: {
        src: [
          "components/codemirror.js",
          "components/cm-mode-javascript.js",
          "components/jquery-2.0.3.js",
          "relaxed-json.js",
          "web.js",
        ],
        dest: "web.min.js",
        options: {
          sourceMap: "web.min.js.map",
          report: "min",
        },
      }
    },
    less: {
      web: {
        src: [
          "web.less",
        ],
        dest: "web.min.css",
        options: {
          report: "min",
          compress: true,
          strictMath: true,
          strictImports: true,
          strictUnits: true,
          syncImport: true,
          sourceMap: true,
          sourceMapFilename: "web.min.css.map",
        }
      },
    },
    watch: {
      less: {
        files: "<%= less.web.src %>",
        tasks: ["less"],
      },
      uglify: {
        files: "<%= uglify.web.src %>",
        tasks: ["uglify:web"],
      },
    },
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-simple-mocha");

  // Default task.
  grunt.registerTask("default", ["jshint", "simplemocha"]);
};
