/* jshint node:true */
var _ = require('lodash');

module.exports = function(grunt) {
  'use strict';

  var readTemplateFile = function(file) {
    var src = file.src.filter(function(filepath) {
      // Warn on and remove invalid source files.
      if (!grunt.file.exists(filepath)) {
        grunt.fail.warn('Source file `' + filepath + '` not found.');
        return false;
      } else {
        return true;
      }
    });

    if (!src.length) {
      grunt.fail.warn('Template not evaluated because `src` files were empty.');
      return;
    }

    return src.map(function(filepath) {
      // Read file source.
      return grunt.file.read(filepath);
    }).join('\n');
  };

  var attachTemplateHelpers = function(options) {
    return _.merge(options.data, {

      // Render helper method. Allows to render
      // partials within template files.
      render: function(filename) {
        var filepath = options.cwd + filename;
        var template = readTemplateFile({ src: [ filepath ] });
        return grunt.template.process(template, options);
      },

      // Translation helper method.
      // Allows resolving keys within a translation file.
      translate: function(key) {
        var translation = options.translations[key];

        if (!translation) {
          grunt.fail.warn('No translation found for key:', key);
        }
        return translation;
      }
    });
  };

  var evaluateFunctions = function(options) {
    var recurse = function(options) {
      _.each(options, function(value, key) {
        if (_.isFunction(value)) {
          options[key] = value();
        }
        else if (_.isObject(value)) {
          options[key] = recurse(value);
        }
      });
      return options;
    };

    return recurse(options);
  };

  grunt.registerMultiTask(
    'template',
    'Template parsing task that allows for partial replacement and translations.',

    function() {

      var options = this.options({
        cwd: process.cwd(),
        data: {},
        delimiters: 'config'
      });

      // Iterate over all specified file groups.
      this.files.forEach(function(file) {

        var originalOptions = evaluateFunctions(options);
        var translations = options.translations || { 'default': {} };

        _.each(translations, function(currentTranslation, language) {

          var templateOptions = _.clone(originalOptions);

          var template = readTemplateFile(file);

          templateOptions.translations = currentTranslation;
          templateOptions = attachTemplateHelpers(templateOptions);

          var result = grunt.template.process(template, {
            data: templateOptions
          });

          var dest = file.dest.replace('%', language);

          // Write the destination file
          grunt.file.write(dest, result);

          // Print a success message
          grunt.log.writeln('File `' + dest + '` created.');
        });
      });
    }
  );
};