(function() {
  var Rule, Scanner, _,
    slice = [].slice;

  _ = require('underscore-plus');

  Scanner = require('./scanner');

  module.exports = Rule = (function() {
    function Rule(grammar, registry, arg) {
      var i, len, pattern, patterns, ref, ref1;
      this.grammar = grammar;
      this.registry = registry;
      ref = arg != null ? arg : {}, this.scopeName = ref.scopeName, this.contentScopeName = ref.contentScopeName, patterns = ref.patterns, this.endPattern = ref.endPattern, this.applyEndPatternLast = ref.applyEndPatternLast;
      this.patterns = [];
      ref1 = patterns != null ? patterns : [];
      for (i = 0, len = ref1.length; i < len; i++) {
        pattern = ref1[i];
        if (!pattern.disabled) {
          this.patterns.push(this.grammar.createPattern(pattern));
        }
      }
      if (this.endPattern && !this.endPattern.hasBackReferences) {
        if (this.applyEndPatternLast) {
          this.patterns.push(this.endPattern);
        } else {
          this.patterns.unshift(this.endPattern);
        }
      }
      this.scannersByBaseGrammarName = {};
      this.createEndPattern = null;
      this.anchorPosition = -1;
    }

    Rule.prototype.getIncludedPatterns = function(baseGrammar, included) {
      var allPatterns, i, len, pattern, ref;
      if (included == null) {
        included = [];
      }
      if (_.include(included, this)) {
        return [];
      }
      included = included.concat([this]);
      allPatterns = [];
      ref = this.patterns;
      for (i = 0, len = ref.length; i < len; i++) {
        pattern = ref[i];
        allPatterns.push.apply(allPatterns, pattern.getIncludedPatterns(baseGrammar, included));
      }
      return allPatterns;
    };

    Rule.prototype.clearAnchorPosition = function() {
      return this.anchorPosition = -1;
    };

    Rule.prototype.getScanner = function(baseGrammar) {
      var patterns, scanner;
      if (scanner = this.scannersByBaseGrammarName[baseGrammar.name]) {
        return scanner;
      }
      patterns = this.getIncludedPatterns(baseGrammar);
      scanner = new Scanner(patterns);
      this.scannersByBaseGrammarName[baseGrammar.name] = scanner;
      return scanner;
    };

    Rule.prototype.scanInjections = function(ruleStack, line, position, firstLine) {
      var baseGrammar, i, injections, len, ref, result, scanner;
      baseGrammar = ruleStack[0].rule.grammar;
      if (injections = baseGrammar.injections) {
        ref = injections.getScanners(ruleStack);
        for (i = 0, len = ref.length; i < len; i++) {
          scanner = ref[i];
          result = scanner.findNextMatch(line, firstLine, position, this.anchorPosition);
          if (result != null) {
            return result;
          }
        }
      }
    };

    Rule.prototype.normalizeCaptureIndices = function(line, captureIndices) {
      var capture, i, len, lineLength;
      lineLength = line.length;
      for (i = 0, len = captureIndices.length; i < len; i++) {
        capture = captureIndices[i];
        capture.end = Math.min(capture.end, lineLength);
        capture.start = Math.min(capture.start, lineLength);
      }
    };

    Rule.prototype.findNextMatch = function(ruleStack, lineWithNewline, position, firstLine) {
      var baseGrammar, i, injection, injectionGrammar, j, len, len1, ref, ref1, result, results, scanner, scopes;
      baseGrammar = ruleStack[0].rule.grammar;
      results = [];
      scanner = this.getScanner(baseGrammar);
      if (result = scanner.findNextMatch(lineWithNewline, firstLine, position, this.anchorPosition)) {
        results.push(result);
      }
      if (result = this.scanInjections(ruleStack, lineWithNewline, position, firstLine)) {
        ref = baseGrammar.injections.injections;
        for (i = 0, len = ref.length; i < len; i++) {
          injection = ref[i];
          if (injection.scanner === result.scanner) {
            if (injection.selector.getPrefix(this.grammar.scopesFromStack(ruleStack)) === 'L') {
              results.unshift(result);
            } else {
              results.push(result);
            }
          }
        }
      }
      scopes = null;
      ref1 = this.registry.injectionGrammars;
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        injectionGrammar = ref1[j];
        if (injectionGrammar === this.grammar) {
          continue;
        }
        if (injectionGrammar === baseGrammar) {
          continue;
        }
        if (scopes == null) {
          scopes = this.grammar.scopesFromStack(ruleStack);
        }
        if (injectionGrammar.injectionSelector.matches(scopes)) {
          scanner = injectionGrammar.getInitialRule().getScanner(injectionGrammar, position, firstLine);
          if (result = scanner.findNextMatch(lineWithNewline, firstLine, position, this.anchorPosition)) {
            if (injectionGrammar.injectionSelector.getPrefix(scopes) === 'L') {
              results.unshift(result);
            } else {
              results.push(result);
            }
          }
        }
      }
      if (results.length > 1) {
        return _.min(results, (function(_this) {
          return function(result) {
            _this.normalizeCaptureIndices(lineWithNewline, result.captureIndices);
            return result.captureIndices[0].start;
          };
        })(this));
      } else if (results.length === 1) {
        result = results[0];
        this.normalizeCaptureIndices(lineWithNewline, result.captureIndices);
        return result;
      }
    };

    Rule.prototype.getNextTags = function(ruleStack, line, lineWithNewline, position, firstLine) {
      var captureIndices, endPatternMatch, firstCapture, index, nextTags, result, scanner;
      result = this.findNextMatch(ruleStack, lineWithNewline, position, firstLine);
      if (result == null) {
        return null;
      }
      index = result.index, captureIndices = result.captureIndices, scanner = result.scanner;
      firstCapture = captureIndices[0];
      endPatternMatch = this.endPattern === scanner.patterns[index];
      if (nextTags = scanner.handleMatch(result, ruleStack, line, this, endPatternMatch)) {
        return {
          nextTags: nextTags,
          tagsStart: firstCapture.start,
          tagsEnd: firstCapture.end
        };
      }
    };

    Rule.prototype.getRuleToPush = function(line, beginPatternCaptureIndices) {
      var rule;
      if (this.endPattern.hasBackReferences) {
        rule = this.grammar.createRule({
          scopeName: this.scopeName,
          contentScopeName: this.contentScopeName
        });
        rule.endPattern = this.endPattern.resolveBackReferences(line, beginPatternCaptureIndices);
        rule.patterns = [rule.endPattern].concat(slice.call(this.patterns));
        return rule;
      } else {
        return this;
      }
    };

    return Rule;

  })();

}).call(this);
