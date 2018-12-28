(function() {
  var AllCustomCaptureIndicesRegex, AllDigitsRegex, DigitRegex, Pattern, _,
    slice = [].slice;

  _ = require('underscore-plus');

  AllCustomCaptureIndicesRegex = /\$(\d+)|\${(\d+):\/(downcase|upcase)}/g;

  AllDigitsRegex = /\\\d+/g;

  DigitRegex = /\\\d+/;

  module.exports = Pattern = (function() {
    function Pattern(grammar, registry, options) {
      var applyEndPatternLast, begin, beginCaptures, capture, captures, contentName, end, endCaptures, endPattern, group, match, name, patterns, ref, ref1;
      this.grammar = grammar;
      this.registry = registry;
      if (options == null) {
        options = {};
      }
      name = options.name, contentName = options.contentName, match = options.match, begin = options.begin, end = options.end, patterns = options.patterns;
      captures = options.captures, beginCaptures = options.beginCaptures, endCaptures = options.endCaptures, applyEndPatternLast = options.applyEndPatternLast;
      this.include = options.include, this.popRule = options.popRule, this.hasBackReferences = options.hasBackReferences;
      this.pushRule = null;
      this.backReferences = null;
      this.scopeName = name;
      this.contentScopeName = contentName;
      if (match) {
        if ((end || this.popRule) && (this.hasBackReferences != null ? this.hasBackReferences : this.hasBackReferences = DigitRegex.test(match))) {
          this.match = match;
        } else {
          this.regexSource = match;
        }
        this.captures = captures;
      } else if (begin) {
        this.regexSource = begin;
        this.captures = beginCaptures != null ? beginCaptures : captures;
        endPattern = this.grammar.createPattern({
          match: end,
          captures: endCaptures != null ? endCaptures : captures,
          popRule: true
        });
        this.pushRule = this.grammar.createRule({
          scopeName: this.scopeName,
          contentScopeName: this.contentScopeName,
          patterns: patterns,
          endPattern: endPattern,
          applyEndPatternLast: applyEndPatternLast
        });
      }
      if (this.captures != null) {
        ref = this.captures;
        for (group in ref) {
          capture = ref[group];
          if (((ref1 = capture.patterns) != null ? ref1.length : void 0) > 0 && !capture.rule) {
            capture.scopeName = this.scopeName;
            capture.rule = this.grammar.createRule(capture);
          }
        }
      }
      this.anchored = this.hasAnchor();
    }

    Pattern.prototype.getRegex = function(firstLine, position, anchorPosition) {
      if (this.anchored) {
        return this.replaceAnchor(firstLine, position, anchorPosition);
      } else {
        return this.regexSource;
      }
    };

    Pattern.prototype.hasAnchor = function() {
      var character, escape, i, len, ref;
      if (!this.regexSource) {
        return false;
      }
      escape = false;
      ref = this.regexSource;
      for (i = 0, len = ref.length; i < len; i++) {
        character = ref[i];
        if (escape && (character === 'A' || character === 'G' || character === 'z')) {
          return true;
        }
        escape = !escape && character === '\\';
      }
      return false;
    };

    Pattern.prototype.replaceAnchor = function(firstLine, offset, anchor) {
      var character, escape, escaped, i, len, placeholder, ref;
      escaped = [];
      placeholder = '\uFFFF';
      escape = false;
      ref = this.regexSource;
      for (i = 0, len = ref.length; i < len; i++) {
        character = ref[i];
        if (escape) {
          switch (character) {
            case 'A':
              if (firstLine) {
                escaped.push("\\" + character);
              } else {
                escaped.push(placeholder);
              }
              break;
            case 'G':
              if (offset === anchor) {
                escaped.push("\\" + character);
              } else {
                escaped.push(placeholder);
              }
              break;
            case 'z':
              escaped.push('$(?!\n)(?<!\n)');
              break;
            default:
              escaped.push("\\" + character);
          }
          escape = false;
        } else if (character === '\\') {
          escape = true;
        } else {
          escaped.push(character);
        }
      }
      return escaped.join('');
    };

    Pattern.prototype.resolveBackReferences = function(line, beginCaptureIndices) {
      var beginCaptures, end, i, len, ref, resolvedMatch, start;
      beginCaptures = [];
      for (i = 0, len = beginCaptureIndices.length; i < len; i++) {
        ref = beginCaptureIndices[i], start = ref.start, end = ref.end;
        beginCaptures.push(line.substring(start, end));
      }
      resolvedMatch = this.match.replace(AllDigitsRegex, function(match) {
        var index;
        index = parseInt(match.slice(1));
        if (beginCaptures[index] != null) {
          return _.escapeRegExp(beginCaptures[index]);
        } else {
          return "\\" + index;
        }
      });
      return this.grammar.createPattern({
        hasBackReferences: false,
        match: resolvedMatch,
        captures: this.captures,
        popRule: this.popRule
      });
    };

    Pattern.prototype.ruleForInclude = function(baseGrammar, name) {
      var grammarName, hashIndex, ref, ref1, ruleName;
      hashIndex = name.indexOf('#');
      if (hashIndex === 0) {
        return this.grammar.getRepository()[name.slice(1)];
      } else if (hashIndex >= 1) {
        grammarName = name.slice(0, +(hashIndex - 1) + 1 || 9e9);
        ruleName = name.slice(hashIndex + 1);
        this.grammar.addIncludedGrammarScope(grammarName);
        return (ref = this.registry.grammarForScopeName(grammarName)) != null ? ref.getRepository()[ruleName] : void 0;
      } else if (name === '$self') {
        return this.grammar.getInitialRule();
      } else if (name === '$base') {
        return baseGrammar.getInitialRule();
      } else {
        this.grammar.addIncludedGrammarScope(name);
        return (ref1 = this.registry.grammarForScopeName(name)) != null ? ref1.getInitialRule() : void 0;
      }
    };

    Pattern.prototype.getIncludedPatterns = function(baseGrammar, included) {
      var ref, rule;
      if (this.include) {
        rule = this.ruleForInclude(baseGrammar, this.include);
        return (ref = rule != null ? rule.getIncludedPatterns(baseGrammar, included) : void 0) != null ? ref : [];
      } else {
        return [this];
      }
    };

    Pattern.prototype.resolveScopeName = function(scopeName, line, captureIndices) {
      var resolvedScopeName;
      return resolvedScopeName = scopeName.replace(AllCustomCaptureIndicesRegex, function(match, index, commandIndex, command) {
        var capture, replacement;
        capture = captureIndices[parseInt(index != null ? index : commandIndex)];
        if (capture != null) {
          replacement = line.substring(capture.start, capture.end);
          while (replacement[0] === '.') {
            replacement = replacement.substring(1);
          }
          switch (command) {
            case 'downcase':
              return replacement.toLowerCase();
            case 'upcase':
              return replacement.toUpperCase();
            default:
              return replacement;
          }
        } else {
          return match;
        }
      });
    };

    Pattern.prototype.handleMatch = function(stack, line, captureIndices, rule, endPatternMatch) {
      var contentScopeName, end, ref, ruleToPush, scopeName, start, tags, zeroWidthMatch;
      tags = [];
      zeroWidthMatch = captureIndices[0].start === captureIndices[0].end;
      if (this.popRule) {
        if (zeroWidthMatch && _.last(stack).zeroWidthMatch && _.last(stack).rule.anchorPosition === captureIndices[0].end) {
          return false;
        }
        contentScopeName = _.last(stack).contentScopeName;
        if (contentScopeName) {
          tags.push(this.grammar.endIdForScope(contentScopeName));
        }
      } else if (this.scopeName) {
        scopeName = this.resolveScopeName(this.scopeName, line, captureIndices);
        tags.push(this.grammar.startIdForScope(scopeName));
      }
      if (this.captures) {
        tags.push.apply(tags, this.tagsForCaptureIndices(line, captureIndices.slice(), captureIndices, stack));
      } else {
        ref = captureIndices[0], start = ref.start, end = ref.end;
        if (end !== start) {
          tags.push(end - start);
        }
      }
      if (this.pushRule) {
        ruleToPush = this.pushRule.getRuleToPush(line, captureIndices);
        ruleToPush.anchorPosition = captureIndices[0].end;
        contentScopeName = ruleToPush.contentScopeName;
        if (contentScopeName) {
          contentScopeName = this.resolveScopeName(contentScopeName, line, captureIndices);
          tags.push(this.grammar.startIdForScope(contentScopeName));
        }
        stack.push({
          rule: ruleToPush,
          scopeName: scopeName,
          contentScopeName: contentScopeName,
          zeroWidthMatch: zeroWidthMatch
        });
      } else {
        if (this.popRule) {
          scopeName = stack.pop().scopeName;
        }
        if (scopeName) {
          tags.push(this.grammar.endIdForScope(scopeName));
        }
      }
      return tags;
    };

    Pattern.prototype.tagsForCaptureRule = function(rule, line, captureStart, captureEnd, stack) {
      var captureTags, captureText, i, len, offset, openScopes, tag, tags;
      captureText = line.substring(captureStart, captureEnd);
      tags = rule.grammar.tokenizeLine(captureText, slice.call(stack).concat([{
          rule: rule
        }]), false, true, false).tags;
      openScopes = [];
      captureTags = [];
      offset = 0;
      for (i = 0, len = tags.length; i < len; i++) {
        tag = tags[i];
        if (!(tag < 0 || (tag > 0 && offset < captureEnd))) {
          continue;
        }
        captureTags.push(tag);
        if (tag >= 0) {
          offset += tag;
        } else {
          if (tag % 2 === 0) {
            openScopes.pop();
          } else {
            openScopes.push(tag);
          }
        }
      }
      while (openScopes.length > 0) {
        captureTags.push(openScopes.pop() - 1);
      }
      return captureTags;
    };

    Pattern.prototype.tagsForCaptureIndices = function(line, currentCaptureIndices, allCaptureIndices, stack) {
      var captureHasNoScope, captureRule, captureTags, childCapture, emptyCapture, parentCapture, parentCaptureScope, previousChildCaptureEnd, ref, ref1, scope, tags;
      parentCapture = currentCaptureIndices.shift();
      tags = [];
      if (scope = (ref = this.captures[parentCapture.index]) != null ? ref.name : void 0) {
        parentCaptureScope = this.resolveScopeName(scope, line, allCaptureIndices);
        tags.push(this.grammar.startIdForScope(parentCaptureScope));
      }
      if (captureRule = (ref1 = this.captures[parentCapture.index]) != null ? ref1.rule : void 0) {
        captureTags = this.tagsForCaptureRule(captureRule, line, parentCapture.start, parentCapture.end, stack);
        tags.push.apply(tags, captureTags);
        while (currentCaptureIndices.length && currentCaptureIndices[0].start < parentCapture.end) {
          currentCaptureIndices.shift();
        }
      } else {
        previousChildCaptureEnd = parentCapture.start;
        while (currentCaptureIndices.length && currentCaptureIndices[0].start < parentCapture.end) {
          childCapture = currentCaptureIndices[0];
          emptyCapture = childCapture.end - childCapture.start === 0;
          captureHasNoScope = !this.captures[childCapture.index];
          if (emptyCapture || captureHasNoScope) {
            currentCaptureIndices.shift();
            continue;
          }
          if (childCapture.start > previousChildCaptureEnd) {
            tags.push(childCapture.start - previousChildCaptureEnd);
          }
          captureTags = this.tagsForCaptureIndices(line, currentCaptureIndices, allCaptureIndices, stack);
          tags.push.apply(tags, captureTags);
          previousChildCaptureEnd = childCapture.end;
        }
        if (parentCapture.end > previousChildCaptureEnd) {
          tags.push(parentCapture.end - previousChildCaptureEnd);
        }
      }
      if (parentCaptureScope) {
        if (tags.length > 1) {
          tags.push(this.grammar.endIdForScope(parentCaptureScope));
        } else {
          tags.pop();
        }
      }
      return tags;
    };

    return Pattern;

  })();

}).call(this);
