(function() {
  var Emitter, EmitterMixin, Grammar, Grim, Injections, OnigRegExp, OnigString, Pattern, Rule, ScopeSelector, TokenizeLineResult, _, fs, loadWASM, path, ref;

  path = require('path');

  _ = require('underscore-plus');

  fs = require('fs-plus');

  ref = require('../onigasm/lib'), loadWASM = ref.loadWASM, OnigRegExp = ref.OnigRegExp, OnigString = ref.OnigString;

  Emitter = require('event-kit').Emitter;

  Grim = require('grim');

  Injections = require('./injections');

  Pattern = require('./pattern');

  Rule = require('./rule');

  ScopeSelector = require('./scope-selector');

  module.exports = Grammar = (function() {
    Grammar.prototype.registration = null;

    function Grammar(registry, options) {
      var firstLineMatch, injectionSelector, injections, patterns, repository;
      this.registry = registry;
      if (options == null) {
        options = {};
      }
      loadWASM();
      this.name = options.name, this.fileTypes = options.fileTypes, this.scopeName = options.scopeName, this.foldingStopMarker = options.foldingStopMarker, this.maxTokensPerLine = options.maxTokensPerLine, this.maxLineLength = options.maxLineLength;
      injections = options.injections, injectionSelector = options.injectionSelector, patterns = options.patterns, repository = options.repository, firstLineMatch = options.firstLineMatch;
      this.emitter = new Emitter;
      this.repository = null;
      this.initialRule = null;
      if (injectionSelector != null) {
        this.injectionSelector = new ScopeSelector(injectionSelector);
      } else {
        this.injectionSelector = null;
      }
      if (firstLineMatch) {
        this.firstLineRegex = new OnigRegExp(firstLineMatch);
      } else {
        this.firstLineRegex = null;
      }
      if (this.fileTypes == null) {
        this.fileTypes = [];
      }
      this.includedGrammarScopes = [];
      this.rawPatterns = patterns;
      this.rawRepository = repository;
      this.rawInjections = injections;
      this.updateRules();
    }


    /*
    Section: Event Subscription
     */

    Grammar.prototype.onDidUpdate = function(callback) {
      return this.emitter.on('did-update', callback);
    };


    /*
    Section: Tokenizing
     */

    Grammar.prototype.tokenizeLines = function(text, compatibilityMode) {
      var i, lastLine, len, line, lineNumber, lines, ref1, results, ruleStack, scopes, tags;
      if (compatibilityMode == null) {
        compatibilityMode = true;
      }
      lines = text.split('\n');
      lastLine = lines.length - 1;
      ruleStack = null;
      scopes = [];
      results = [];
      for (lineNumber = i = 0, len = lines.length; i < len; lineNumber = ++i) {
        line = lines[lineNumber];
        ref1 = this.tokenizeLine(line, ruleStack, lineNumber === 0, compatibilityMode, lineNumber !== lastLine), tags = ref1.tags, ruleStack = ref1.ruleStack;
        results.push(this.registry.decodeTokens(line, tags, scopes));
      }
      return results;
    };

    Grammar.prototype.tokenizeLine = function(inputLine, ruleStack, firstLine, compatibilityMode, appendNewLine) {
      var contentScopeName, i, initialRuleStackLength, j, k, lastRule, lastSymbol, len, len1, len2, line, match, nextTags, openScopeTags, penultimateRule, popStack, position, previousPosition, previousRuleStackLength, ref1, ref2, ref3, ref4, ref5, ref6, ref7, rule, scopeName, string, stringWithNewLine, tag, tagCount, tags, tagsEnd, tagsStart, tokenCount, truncatedLine;
      if (firstLine == null) {
        firstLine = false;
      }
      if (compatibilityMode == null) {
        compatibilityMode = true;
      }
      if (appendNewLine == null) {
        appendNewLine = true;
      }
      tags = [];
      truncatedLine = false;
      if (inputLine.length > this.maxLineLength) {
        line = inputLine.slice(0, this.maxLineLength);
        truncatedLine = true;
      } else {
        line = inputLine;
      }
      string = new OnigString(line);
      stringWithNewLine = appendNewLine ? new OnigString(line + '\n') : string;
      if (ruleStack != null) {
        ruleStack = ruleStack.slice();
        if (compatibilityMode) {
          openScopeTags = [];
          for (i = 0, len = ruleStack.length; i < len; i++) {
            ref1 = ruleStack[i], scopeName = ref1.scopeName, contentScopeName = ref1.contentScopeName;
            if (scopeName) {
              openScopeTags.push(this.registry.startIdForScope(scopeName));
            }
            if (contentScopeName) {
              openScopeTags.push(this.registry.startIdForScope(contentScopeName));
            }
          }
        }
      } else {
        if (compatibilityMode) {
          openScopeTags = [];
        }
        ref2 = this.initialRule, scopeName = ref2.scopeName, contentScopeName = ref2.contentScopeName;
        ruleStack = [
          {
            rule: this.initialRule,
            scopeName: scopeName,
            contentScopeName: contentScopeName
          }
        ];
        if (scopeName) {
          tags.push(this.startIdForScope(this.initialRule.scopeName));
        }
        if (contentScopeName) {
          tags.push(this.startIdForScope(this.initialRule.contentScopeName));
        }
      }
      initialRuleStackLength = ruleStack.length;
      position = 0;
      tokenCount = 0;
      while (true) {
        previousRuleStackLength = ruleStack.length;
        previousPosition = position;
        if (position > line.length) {
          break;
        }
        if (tokenCount >= this.getMaxTokensPerLine() - 1) {
          truncatedLine = true;
          break;
        }
        if (match = _.last(ruleStack).rule.getNextTags(ruleStack, string, stringWithNewLine, position, firstLine)) {
          nextTags = match.nextTags, tagsStart = match.tagsStart, tagsEnd = match.tagsEnd;
          if (position < tagsStart) {
            tags.push(tagsStart - position);
            tokenCount++;
          }
          tags.push.apply(tags, nextTags);
          for (j = 0, len1 = nextTags.length; j < len1; j++) {
            tag = nextTags[j];
            if (tag >= 0) {
              tokenCount++;
            }
          }
          position = tagsEnd;
        } else {
          if (position < line.length || line.length === 0) {
            tags.push(line.length - position);
          }
          break;
        }
        if (position === previousPosition) {
          if (ruleStack.length === previousRuleStackLength) {
            console.error("Popping rule because it loops at column " + position + " of line '" + line + "'", _.clone(ruleStack));
            if (ruleStack.length > 1) {
              ref3 = ruleStack.pop(), scopeName = ref3.scopeName, contentScopeName = ref3.contentScopeName;
              if (contentScopeName) {
                tags.push(this.endIdForScope(contentScopeName));
              }
              if (scopeName) {
                tags.push(this.endIdForScope(scopeName));
              }
            } else {
              if (position < line.length || (line.length === 0 && tags.length === 0)) {
                tags.push(line.length - position);
              }
              break;
            }
          } else if (ruleStack.length > previousRuleStackLength) {
            ref4 = ruleStack.slice(-2), (ref5 = ref4[0], penultimateRule = ref5.rule), (ref6 = ref4[1], lastRule = ref6.rule);
            if ((lastRule != null) && lastRule === penultimateRule) {
              popStack = true;
            }
            if (((lastRule != null ? lastRule.scopeName : void 0) != null) && penultimateRule.scopeName === lastRule.scopeName) {
              popStack = true;
            }
            if (popStack) {
              ruleStack.pop();
              lastSymbol = _.last(tags);
              if (lastSymbol < 0 && lastSymbol === this.startIdForScope(lastRule.scopeName)) {
                tags.pop();
              }
              tags.push(line.length - position);
              break;
            }
          }
        }
      }
      if (truncatedLine) {
        tagCount = tags.length;
        if (tags[tagCount - 1] > 0) {
          tags[tagCount - 1] += inputLine.length - position;
        } else {
          tags.push(inputLine.length - position);
        }
        while (ruleStack.length > initialRuleStackLength) {
          ref7 = ruleStack.pop(), scopeName = ref7.scopeName, contentScopeName = ref7.contentScopeName;
          if (contentScopeName) {
            tags.push(this.endIdForScope(contentScopeName));
          }
          if (scopeName) {
            tags.push(this.endIdForScope(scopeName));
          }
        }
      }
      for (k = 0, len2 = ruleStack.length; k < len2; k++) {
        rule = ruleStack[k].rule;
        rule.clearAnchorPosition();
      }
      if (compatibilityMode) {
        return new TokenizeLineResult(inputLine, openScopeTags, tags, ruleStack, this.registry);
      } else {
        return {
          line: inputLine,
          tags: tags,
          ruleStack: ruleStack
        };
      }
    };

    Grammar.prototype.activate = function() {
      return this.registration = this.registry.addGrammar(this);
    };

    Grammar.prototype.deactivate = function() {
      var ref1;
      this.emitter = new Emitter;
      if ((ref1 = this.registration) != null) {
        ref1.dispose();
      }
      return this.registration = null;
    };

    Grammar.prototype.updateRules = function() {
      this.initialRule = this.createRule({
        scopeName: this.scopeName,
        patterns: this.rawPatterns
      });
      this.repository = this.createRepository();
      return this.injections = new Injections(this, this.rawInjections);
    };

    Grammar.prototype.getInitialRule = function() {
      return this.initialRule;
    };

    Grammar.prototype.getRepository = function() {
      return this.repository;
    };

    Grammar.prototype.createRepository = function() {
      var data, name, ref1, repository;
      repository = {};
      ref1 = this.rawRepository;
      for (name in ref1) {
        data = ref1[name];
        if ((data.begin != null) || (data.match != null)) {
          data = {
            patterns: [data],
            tempName: name
          };
        }
        repository[name] = this.createRule(data);
      }
      return repository;
    };

    Grammar.prototype.addIncludedGrammarScope = function(scope) {
      if (!_.include(this.includedGrammarScopes, scope)) {
        return this.includedGrammarScopes.push(scope);
      }
    };

    Grammar.prototype.grammarUpdated = function(scopeName) {
      if (!_.include(this.includedGrammarScopes, scopeName)) {
        return false;
      }
      this.updateRules();
      this.registry.grammarUpdated(this.scopeName);
      if (Grim.includeDeprecatedAPIs) {
        this.emit('grammar-updated');
      }
      this.emitter.emit('did-update');
      return true;
    };

    Grammar.prototype.startIdForScope = function(scope) {
      return this.registry.startIdForScope(scope);
    };

    Grammar.prototype.endIdForScope = function(scope) {
      return this.registry.endIdForScope(scope);
    };

    Grammar.prototype.scopeForId = function(id) {
      return this.registry.scopeForId(id);
    };

    Grammar.prototype.createRule = function(options) {
      return new Rule(this, this.registry, options);
    };

    Grammar.prototype.createPattern = function(options) {
      return new Pattern(this, this.registry, options);
    };

    Grammar.prototype.getMaxTokensPerLine = function() {
      return this.maxTokensPerLine;
    };

    Grammar.prototype.scopesFromStack = function(stack, rule, endPatternMatch) {
      var contentScopeName, i, len, ref1, scopeName, scopes;
      scopes = [];
      for (i = 0, len = stack.length; i < len; i++) {
        ref1 = stack[i], scopeName = ref1.scopeName, contentScopeName = ref1.contentScopeName;
        if (scopeName) {
          scopes.push(scopeName);
        }
        if (contentScopeName) {
          scopes.push(contentScopeName);
        }
      }
      if (endPatternMatch && (rule != null ? rule.contentScopeName : void 0) && rule === stack[stack.length - 1]) {
        scopes.pop();
      }
      return scopes;
    };

    return Grammar;

  })();

  if (Grim.includeDeprecatedAPIs) {
    EmitterMixin = require('emissary').Emitter;
    EmitterMixin.includeInto(Grammar);
    Grammar.prototype.on = function(eventName) {
      if (eventName === 'did-update') {
        Grim.deprecate("Call Grammar::onDidUpdate instead");
      } else {
        Grim.deprecate("Call explicit event subscription methods instead");
      }
      return EmitterMixin.prototype.on.apply(this, arguments);
    };
  }

  TokenizeLineResult = (function() {
    function TokenizeLineResult(line1, openScopeTags1, tags1, ruleStack1, registry) {
      this.line = line1;
      this.openScopeTags = openScopeTags1;
      this.tags = tags1;
      this.ruleStack = ruleStack1;
      this.registry = registry;
    }

    Object.defineProperty(TokenizeLineResult.prototype, 'tokens', {
      get: function() {
        return this.registry.decodeTokens(this.line, this.tags, this.openScopeTags);
      }
    });

    return TokenizeLineResult;

  })();

}).call(this);
