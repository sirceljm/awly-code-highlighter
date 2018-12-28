(function() {
  var Grammar, NullGrammar,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Grammar = require('./grammar');

  module.exports = NullGrammar = (function(superClass) {
    extend(NullGrammar, superClass);

    function NullGrammar(registry) {
      var name, scopeName;
      name = 'Null Grammar';
      scopeName = 'text.plain.null-grammar';
      NullGrammar.__super__.constructor.call(this, registry, {
        name: name,
        scopeName: scopeName
      });
    }

    NullGrammar.prototype.getScore = function() {
      return 0;
    };

    return NullGrammar;

  })(Grammar);

}).call(this);
