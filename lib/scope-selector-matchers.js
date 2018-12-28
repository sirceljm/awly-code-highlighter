(function() {
  var AndMatcher, CompositeMatcher, GroupMatcher, NegateMatcher, OrMatcher, PathMatcher, ScopeMatcher, SegmentMatcher, TrueMatcher;

  SegmentMatcher = (function() {
    function SegmentMatcher(segments) {
      this.segment = segments[0].join('') + segments[1].join('');
    }

    SegmentMatcher.prototype.matches = function(scope) {
      return scope === this.segment;
    };

    SegmentMatcher.prototype.getPrefix = function(scope) {};

    SegmentMatcher.prototype.toCssSelector = function() {
      return this.segment.split('.').map(function(dotFragment) {
        return '.' + dotFragment.replace(/\+/g, '\\+');
      }).join('');
    };

    SegmentMatcher.prototype.toCssSyntaxSelector = function() {
      return this.segment.split('.').map(function(dotFragment) {
        return '.syntax--' + dotFragment.replace(/\+/g, '\\+');
      }).join('');
    };

    return SegmentMatcher;

  })();

  TrueMatcher = (function() {
    function TrueMatcher() {}

    TrueMatcher.prototype.matches = function() {
      return true;
    };

    TrueMatcher.prototype.getPrefix = function(scopes) {};

    TrueMatcher.prototype.toCssSelector = function() {
      return '*';
    };

    TrueMatcher.prototype.toCssSyntaxSelector = function() {
      return '*';
    };

    return TrueMatcher;

  })();

  ScopeMatcher = (function() {
    function ScopeMatcher(first, others) {
      var i, len, segment;
      this.segments = [first];
      for (i = 0, len = others.length; i < len; i++) {
        segment = others[i];
        this.segments.push(segment[1]);
      }
    }

    ScopeMatcher.prototype.matches = function(scope) {
      var i, lastDotIndex, len, matcherSegment, matcherSegmentIndex, nextDotIndex, ref, scopeSegment;
      lastDotIndex = 0;
      ref = this.segments;
      for (matcherSegmentIndex = i = 0, len = ref.length; i < len; matcherSegmentIndex = ++i) {
        matcherSegment = ref[matcherSegmentIndex];
        if (lastDotIndex > scope.length) {
          break;
        }
        nextDotIndex = scope.indexOf('.', lastDotIndex);
        if (nextDotIndex === -1) {
          nextDotIndex = scope.length;
        }
        scopeSegment = scope.substring(lastDotIndex, nextDotIndex);
        if (!matcherSegment.matches(scopeSegment)) {
          return false;
        }
        lastDotIndex = nextDotIndex + 1;
      }
      return matcherSegmentIndex === this.segments.length;
    };

    ScopeMatcher.prototype.getPrefix = function(scope) {
      var i, index, len, ref, scopeSegments, segment;
      scopeSegments = scope.split('.');
      if (scopeSegments.length < this.segments.length) {
        return false;
      }
      ref = this.segments;
      for (index = i = 0, len = ref.length; i < len; index = ++i) {
        segment = ref[index];
        if (segment.matches(scopeSegments[index])) {
          if (segment.prefix != null) {
            return segment.prefix;
          }
        }
      }
    };

    ScopeMatcher.prototype.toCssSelector = function() {
      return this.segments.map(function(matcher) {
        return matcher.toCssSelector();
      }).join('');
    };

    ScopeMatcher.prototype.toCssSyntaxSelector = function() {
      return this.segments.map(function(matcher) {
        return matcher.toCssSyntaxSelector();
      }).join('');
    };

    return ScopeMatcher;

  })();

  GroupMatcher = (function() {
    function GroupMatcher(prefix, selector) {
      this.prefix = prefix != null ? prefix[0] : void 0;
      this.selector = selector;
    }

    GroupMatcher.prototype.matches = function(scopes) {
      return this.selector.matches(scopes);
    };

    GroupMatcher.prototype.getPrefix = function(scopes) {
      if (this.selector.matches(scopes)) {
        return this.prefix;
      }
    };

    GroupMatcher.prototype.toCssSelector = function() {
      return this.selector.toCssSelector();
    };

    GroupMatcher.prototype.toCssSyntaxSelector = function() {
      return this.selector.toCssSyntaxSelector();
    };

    return GroupMatcher;

  })();

  PathMatcher = (function() {
    function PathMatcher(prefix, first, others) {
      var i, len, matcher;
      this.prefix = prefix != null ? prefix[0] : void 0;
      this.matchers = [first];
      for (i = 0, len = others.length; i < len; i++) {
        matcher = others[i];
        this.matchers.push(matcher[1]);
      }
    }

    PathMatcher.prototype.matches = function(scopes) {
      var i, index, len, matcher, scope;
      index = 0;
      matcher = this.matchers[index];
      for (i = 0, len = scopes.length; i < len; i++) {
        scope = scopes[i];
        if (matcher.matches(scope)) {
          matcher = this.matchers[++index];
        }
        if (matcher == null) {
          return true;
        }
      }
      return false;
    };

    PathMatcher.prototype.getPrefix = function(scopes) {
      if (this.matches(scopes)) {
        return this.prefix;
      }
    };

    PathMatcher.prototype.toCssSelector = function() {
      return this.matchers.map(function(matcher) {
        return matcher.toCssSelector();
      }).join(' ');
    };

    PathMatcher.prototype.toCssSyntaxSelector = function() {
      return this.matchers.map(function(matcher) {
        return matcher.toCssSyntaxSelector();
      }).join(' ');
    };

    return PathMatcher;

  })();

  OrMatcher = (function() {
    function OrMatcher(left1, right1) {
      this.left = left1;
      this.right = right1;
    }

    OrMatcher.prototype.matches = function(scopes) {
      return this.left.matches(scopes) || this.right.matches(scopes);
    };

    OrMatcher.prototype.getPrefix = function(scopes) {
      return this.left.getPrefix(scopes) || this.right.getPrefix(scopes);
    };

    OrMatcher.prototype.toCssSelector = function() {
      return (this.left.toCssSelector()) + ", " + (this.right.toCssSelector());
    };

    OrMatcher.prototype.toCssSyntaxSelector = function() {
      return (this.left.toCssSyntaxSelector()) + ", " + (this.right.toCssSyntaxSelector());
    };

    return OrMatcher;

  })();

  AndMatcher = (function() {
    function AndMatcher(left1, right1) {
      this.left = left1;
      this.right = right1;
    }

    AndMatcher.prototype.matches = function(scopes) {
      return this.left.matches(scopes) && this.right.matches(scopes);
    };

    AndMatcher.prototype.getPrefix = function(scopes) {
      if (this.left.matches(scopes) && this.right.matches(scopes)) {
        return this.left.getPrefix(scopes);
      }
    };

    AndMatcher.prototype.toCssSelector = function() {
      if (this.right instanceof NegateMatcher) {
        return "" + (this.left.toCssSelector()) + (this.right.toCssSelector());
      } else {
        return (this.left.toCssSelector()) + " " + (this.right.toCssSelector());
      }
    };

    AndMatcher.prototype.toCssSyntaxSelector = function() {
      if (this.right instanceof NegateMatcher) {
        return "" + (this.left.toCssSyntaxSelector()) + (this.right.toCssSyntaxSelector());
      } else {
        return (this.left.toCssSyntaxSelector()) + " " + (this.right.toCssSyntaxSelector());
      }
    };

    return AndMatcher;

  })();

  NegateMatcher = (function() {
    function NegateMatcher(matcher1) {
      this.matcher = matcher1;
    }

    NegateMatcher.prototype.matches = function(scopes) {
      return !this.matcher.matches(scopes);
    };

    NegateMatcher.prototype.getPrefix = function(scopes) {};

    NegateMatcher.prototype.toCssSelector = function() {
      return ":not(" + (this.matcher.toCssSelector()) + ")";
    };

    NegateMatcher.prototype.toCssSyntaxSelector = function() {
      return ":not(" + (this.matcher.toCssSyntaxSelector()) + ")";
    };

    return NegateMatcher;

  })();

  CompositeMatcher = (function() {
    function CompositeMatcher(left, operator, right) {
      switch (operator) {
        case '|':
          this.matcher = new OrMatcher(left, right);
          break;
        case '&':
          this.matcher = new AndMatcher(left, right);
          break;
        case '-':
          this.matcher = new AndMatcher(left, new NegateMatcher(right));
      }
    }

    CompositeMatcher.prototype.matches = function(scopes) {
      return this.matcher.matches(scopes);
    };

    CompositeMatcher.prototype.getPrefix = function(scopes) {
      return this.matcher.getPrefix(scopes);
    };

    CompositeMatcher.prototype.toCssSelector = function() {
      return this.matcher.toCssSelector();
    };

    CompositeMatcher.prototype.toCssSyntaxSelector = function() {
      return this.matcher.toCssSyntaxSelector();
    };

    return CompositeMatcher;

  })();

  module.exports = {
    AndMatcher: AndMatcher,
    CompositeMatcher: CompositeMatcher,
    GroupMatcher: GroupMatcher,
    NegateMatcher: NegateMatcher,
    OrMatcher: OrMatcher,
    PathMatcher: PathMatcher,
    ScopeMatcher: ScopeMatcher,
    SegmentMatcher: SegmentMatcher,
    TrueMatcher: TrueMatcher
  };

}).call(this);
