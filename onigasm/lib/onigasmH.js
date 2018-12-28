"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function loadWASM() {
    if (!exports.onigasmH) {
        exports.onigasmH = require('./onigasm.js' /** when TS is compiled to JS, this will mean `lib/onigasm.js` (emitted by `emcc`) */)();
    }
}
exports.loadWASM = loadWASM;
//# sourceMappingURL=onigasmH.js.map