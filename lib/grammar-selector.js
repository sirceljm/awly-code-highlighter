
var pathSplitRegex = new RegExp("[/.]");

module.exports = function(){
    var grammarSelector = {
        selectGrammar:function(registry, filePath, fileContents) {
            var self = this;
            var bestScore = null;
            var bestScoringGrammar = null;

            for(let i = 0; i < registry.grammars.length; i++) {
                const score = self.getScore(registry.grammars[i], filePath, fileContents);
                if(bestScore === null || score > bestScore){
                    bestScore = score;
                    bestScoringGrammar = registry.grammars[i];
                }
            }

            return bestScoringGrammar;
        },
        grammarOverridesByPath:{},
        grammarOverrideForPath:function(filePath) {
            return this.grammarOverridesByPath[filePath];
        },
        setGrammarOverrideForPath:function(filePath, scopeName) {
            if (filePath) {
                return this.grammarOverridesByPath[filePath] = scopeName;
            }
        },
        clearGrammarOverrideForPath:function(filePath) {
            delete this.grammarOverridesByPath[filePath];
        },
        clearGrammarOverrides:function(){
            this.grammarOverridesByPath = {};
        },
        getScore:function(grammar,filePath,fileContents){
            // get score will not call fs anymore. hiding secret fs ops can destroy performance.

            filePath = filePath||"";

            if (this.grammarOverrideForPath(filePath) === grammar.scopeName) {
                return 2 + filePath.length;
            } else if (fileContents && this.matchesContents(grammar, fileContents)) {
                return 1 + filePath.length;
            } else {
                return this.getPathScore(grammar, filePath);
            }
        },
        matchesContents:function(grammar,contents) {
            var character, escaped, lines, numberOfNewlinesInRegex, _i, _len, _ref;

            if (typeof contents !== "string" || !grammar.firstLineRegex) {
                return false;
            }

            escaped = false;
            numberOfNewlinesInRegex = 0;
            _ref = grammar.firstLineRegex.source;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                character = _ref[_i];
                switch (character) {
                case "\\":
                    escaped = !escaped;
                    break;
                case "n":
                    if (escaped) {
                        numberOfNewlinesInRegex++;
                    }
                    escaped = false;
                    break;
                default:
                    escaped = false;
                }
            }
            lines = contents.split("\n");
            return grammar.firstLineRegex.testSync(lines.slice(0, +numberOfNewlinesInRegex + 1 || 9e9).join("\n"));
        },
        getPathScore:function(grammar,filePath) {
            var fileType, fileTypeComponents, pathComponents, pathScore, pathSuffix, _i, _len, _ref;
            if (!filePath) {
                return -1;
            }
            if (process.platform === "win32") {
                filePath = filePath.replace(/\\/g, "/");
            }
            pathComponents = filePath.toLowerCase().split(pathSplitRegex);
            pathScore = -1;
            _ref = grammar.fileTypes;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                fileType = _ref[_i];
                fileTypeComponents = fileType.toLowerCase().split(pathSplitRegex);
                pathSuffix = pathComponents.slice(-fileTypeComponents.length);
                if (JSON.stringify(pathSuffix) === JSON.stringify(fileTypeComponents)) {
                    pathScore = Math.max(pathScore, fileType.length);
                }
            }
            return pathScore;
        }
    };

    return grammarSelector;
};
