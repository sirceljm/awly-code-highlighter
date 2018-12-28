// Just to keep typescript quiet
declare const require

export let onigasmH;

export function loadWASM() {
    if (!onigasmH) {
        onigasmH = require('./onigasm.js' /** when TS is compiled to JS, this will mean `lib/onigasm.js` (emitted by `emcc`) */)();
    }
}
