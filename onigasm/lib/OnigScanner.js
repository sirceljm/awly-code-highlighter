"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LRUCache = require('lru-cache');
// ugly code end
const onigasmH_1 = require("./onigasmH");
const OnigString_1 = require("./OnigString");
const cache = new LRUCache({
    dispose: (scanner, info) => {
        const status = onigasmH_1.onigasmH.ccall('disposeCompiledPatterns', 'number', ['array', 'number'], [info.regexTPtrs, scanner.patterns.length]);
        if (status !== 0) {
            const errString = onigasmH_1.onigasmH.ccall('getLastError', 'string');
            throw new Error(errString);
        }
    },
    max: 1000,
});
class OnigScanner {
    /**
     * Create a new scanner with the given patterns
     * @param patterns  An array of string patterns
     */
    constructor(patterns) {
        if (onigasmH_1.onigasmH === null) {
            throw new Error(`Onigasm has not been initialized, call loadWASM from 'onigasm' exports before using any other API`);
        }
        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            if (typeof pattern !== 'string') {
                throw new TypeError(`First parameter to OnigScanner constructor must be array of (pattern) strings`);
            }
        }
        this.sources = patterns.slice();
    }
    get patterns() {
        return this.sources.slice();
    }
    /**
     * Find the next match from a given position
     * @param string The string to search
     * @param startPosition The optional position to start at, defaults to 0
     * @param callback The (error, match) function to call when done, match will null when there is no match
     */
    findNextMatch(string, startPosition, callback) {
        if (startPosition == null) {
            startPosition = 0;
        }
        if (typeof startPosition === 'function') {
            callback = startPosition;
            startPosition = 0;
        }
        try {
            const match = this.findNextMatchSync(string, startPosition);
            callback(null, match);
        }
        catch (error) {
            callback(error);
        }
    }
    /**
     * Find the next match from a given position
     * @param string The string to search
     * @param startPosition The optional position to start at, defaults to 0
     */
    findNextMatchSync(string, startPosition) {
        if (startPosition == null) {
            startPosition = 0;
        }
        startPosition = this.convertToNumber(startPosition);
        let onigNativeInfo = cache.get(this);
        let status = 0;
        if (!onigNativeInfo) {
            const regexTAddrRecieverPtr = onigasmH_1.onigasmH._malloc(4);
            const regexTPtrs = [];
            for (let i = 0; i < this.sources.length; i++) {
                const pattern = this.sources[i];
                status = onigasmH_1.onigasmH.ccall('compilePattern', 'number', ['string', 'number'], [pattern, regexTAddrRecieverPtr]);
                if (status !== 0) {
                    const errString = onigasmH_1.onigasmH.ccall('getLastError', 'string');
                    throw new Error(errString);
                }
                const regexTAddress = new Uint32Array(onigasmH_1.onigasmH.buffer, regexTAddrRecieverPtr, 1)[0];
                regexTPtrs.push(regexTAddress);
            }
            onigNativeInfo = {
                regexTPtrs: new Uint8Array(Uint32Array.from(regexTPtrs).buffer),
            };
            onigasmH_1.onigasmH._free(regexTAddrRecieverPtr);
            cache.set(this, onigNativeInfo);
        }
        const resultInfoReceiverPtr = onigasmH_1.onigasmH._malloc(8);
        const onigString = string instanceof OnigString_1.default ? string : new OnigString_1.default(this.convertToString(string));
        const strPtr = onigasmH_1.onigasmH._malloc(onigString.utf8Bytes.length);
        onigasmH_1.onigasmH.HEAPU8.set(onigString.utf8Bytes, strPtr);
        status = onigasmH_1.onigasmH.ccall('findBestMatch', 'number', ['array', 'number', 'number', 'number', 'number', 'number'], [
            // regex_t **patterns
            onigNativeInfo.regexTPtrs,
            // int patternCount
            this.sources.length,
            // UChar *utf8String
            strPtr,
            // int strLen
            onigString.utf8Bytes.length - 1,
            // int startOffset
            onigString.convertUtf16OffsetToUtf8(startPosition),
            // int *resultInfo
            resultInfoReceiverPtr,
        ]);
        if (status !== 0) {
            const errString = onigasmH_1.onigasmH.ccall('getLastError', 'string');
            throw new Error(errString);
        }
        const [
        // The index of pattern which matched the string at least offset from 0 (start)
        bestPatternIdx, 
        // Begin address of capture info encoded as pairs
        // like [start, end, start, end, start, end, ...]
        //  - first start-end pair is entire match (index 0 and 1)
        //  - subsequent pairs are capture groups (2, 3 = first capture group, 4, 5 = second capture group and so on)
        encodedResultBeginAddress, 
        // Length of the [start, end, ...] sequence so we know how much memory to read (will always be 0 or multiple of 2)
        encodedResultLength,] = new Uint32Array(onigasmH_1.onigasmH.buffer, resultInfoReceiverPtr, 3);
        onigasmH_1.onigasmH._free(strPtr);
        onigasmH_1.onigasmH._free(resultInfoReceiverPtr);
        if (encodedResultLength > 0) {
            const encodedResult = new Uint32Array(onigasmH_1.onigasmH.buffer, encodedResultBeginAddress, encodedResultLength);
            const captureIndices = [];
            let i = 0;
            let captureIdx = 0;
            while (i < encodedResultLength) {
                const index = captureIdx++;
                let start = encodedResult[i++];
                let end = encodedResult[i++];
                if (onigString.hasMultiByteCharacters) {
                    start = onigString.convertUtf8OffsetToUtf16(start);
                    end = onigString.convertUtf8OffsetToUtf16(end);
                }
                captureIndices.push({
                    end,
                    index,
                    length: end - start,
                    start,
                });
            }
            onigasmH_1.onigasmH._free(encodedResultBeginAddress);
            return {
                captureIndices,
                index: bestPatternIdx,
                scanner: this,
            };
        }
        return null;
    }
    convertToString(value) {
        if (value === undefined) {
            return 'undefined';
        }
        if (value === null) {
            return 'null';
        }
        if (value instanceof OnigString_1.default) {
            return value.content;
        }
        return value.toString();
    }
    convertToNumber(value) {
        value = parseInt(value, 10);
        if (!isFinite(value)) {
            value = 0;
        }
        value = Math.max(value, 0);
        return value;
    }
}
exports.OnigScanner = OnigScanner;
exports.default = OnigScanner;
//# sourceMappingURL=OnigScanner.js.map