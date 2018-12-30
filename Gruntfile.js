/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        copy: {
            main: {
                files: [{
                    expand: true,
                    cwd: "src",
                    src: ["*.js"],
                    dest: "lib/"
                }
                ]
            }
        },

        peg: {
            glob_to_multiple: {
                expand: true,
                cwd: "src",
                src: ["*.pegjs"],
                dest: "lib",
                ext: ".js"
            }
        },

        shell: {
            test: {
                command: "node node_modules/.bin/jasmine-focused --captureExceptions spec",
                options: {
                    stdout: true,
                    stderr: true,
                    failOnError: true
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks("grunt-peg");
    grunt.loadTasks("tasks");

    grunt.registerTask("clean", function() {
        if (grunt.file.exists("lib")) {
            grunt.file.delete("lib");
        }
        if (grunt.file.exists("gen")) {
            return grunt.file.delete("gen");
        }
    });

    grunt.registerTask("default", ["copy", "peg", "build-grammars"]);
    grunt.registerTask("test", ["default", "shell:test"]);
    return grunt.registerTask("prepublish", ["clean", "build-grammars", "test"]);
};
