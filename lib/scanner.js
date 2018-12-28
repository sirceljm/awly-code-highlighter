(function() {
  var OnigScanner, Scanner;

  OnigScanner = require('../onigasm/lib').OnigScanner;

  module.exports = Scanner = (function() {
    function Scanner(patterns1) {
      var i, len, pattern, ref;
      this.patterns = patterns1 != null ? patterns1 : [];
      this.anchored = false;
      ref = this.patterns;
      for (i = 0, len = ref.length; i < len; i++) {
        pattern = ref[i];
        if (!pattern.anchored) {
          continue;
        }
        this.anchored = true;
        break;
      }
      this.anchoredScanner = null;
      this.firstLineAnchoredScanner = null;
      this.firstLineScanner = null;
      this.scanner = null;
    }

    Scanner.prototype.createScanner = function(firstLine, position, anchorPosition) {
      var patterns, scanner;
      patterns = this.patterns.map(function(pattern) {
        return pattern.getRegex(firstLine, position, anchorPosition);
      });
      return scanner = new OnigScanner(patterns);
    };

    Scanner.prototype.getScanner = function(firstLine, position, anchorPosition) {
      if (!this.anchored) {
        if (this.scanner == null) {
          this.scanner = this.createScanner(firstLine, position, anchorPosition);
        }
        return this.scanner;
      }
      if (firstLine) {
        if (position === anchorPosition) {
          return this.firstLineAnchoredScanner != null ? this.firstLineAnchoredScanner : this.firstLineAnchoredScanner = this.createScanner(firstLine, position, anchorPosition);
        } else {
          return this.firstLineScanner != null ? this.firstLineScanner : this.firstLineScanner = this.createScanner(firstLine, position, anchorPosition);
        }
      } else if (position === anchorPosition) {
        return this.anchoredScanner != null ? this.anchoredScanner : this.anchoredScanner = this.createScanner(firstLine, position, anchorPosition);
      } else {
        return this.scanner != null ? this.scanner : this.scanner = this.createScanner(firstLine, position, anchorPosition);
      }
    };

    Scanner.prototype.findNextMatch = function(line, firstLine, position, anchorPosition) {
      var match, scanner;
      scanner = this.getScanner(firstLine, position, anchorPosition);
      match = scanner.findNextMatchSync(line, position);
      if (match != null) {
        match.scanner = this;
      }
      return match;
    };

    Scanner.prototype.handleMatch = function(match, stack, line, rule, endPatternMatch) {
      var pattern;
      pattern = this.patterns[match.index];
      return pattern.handleMatch(stack, line, match.captureIndices, rule, endPatternMatch);
    };

    return Scanner;

  })();

}).call(this);
