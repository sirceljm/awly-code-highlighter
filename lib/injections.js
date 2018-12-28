(function() {
  var Injections, Scanner, ScopeSelector, _;

  _ = require('underscore-plus');

  Scanner = require('./scanner');

  ScopeSelector = require('./scope-selector');

  module.exports = Injections = (function() {
    function Injections(grammar, injections) {
      var i, len, pattern, patterns, ref, ref1, regex, selector, values;
      this.grammar = grammar;
      if (injections == null) {
        injections = {};
      }
      this.injections = [];
      this.scanners = {};
      for (selector in injections) {
        values = injections[selector];
        if (!((values != null ? (ref = values.patterns) != null ? ref.length : void 0 : void 0) > 0)) {
          continue;
        }
        patterns = [];
        ref1 = values.patterns;
        for (i = 0, len = ref1.length; i < len; i++) {
          regex = ref1[i];
          pattern = this.grammar.createPattern(regex);
          patterns.push.apply(patterns, pattern.getIncludedPatterns(this.grammar, patterns));
        }
        this.injections.push({
          selector: new ScopeSelector(selector),
          patterns: patterns
        });
      }
    }

    Injections.prototype.getScanner = function(injection) {
      var scanner;
      if (injection.scanner != null) {
        return injection.scanner;
      }
      scanner = new Scanner(injection.patterns);
      injection.scanner = scanner;
      return scanner;
    };

    Injections.prototype.getScanners = function(ruleStack) {
      var i, injection, len, ref, scanner, scanners, scopes;
      if (this.injections.length === 0) {
        return [];
      }
      scanners = [];
      scopes = this.grammar.scopesFromStack(ruleStack);
      ref = this.injections;
      for (i = 0, len = ref.length; i < len; i++) {
        injection = ref[i];
        if (!(injection.selector.matches(scopes))) {
          continue;
        }
        scanner = this.getScanner(injection);
        scanners.push(scanner);
      }
      return scanners;
    };

    return Injections;

  })();

}).call(this);
