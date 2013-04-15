/*
  Copyright (c) 2013, Oleg Grenrus
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:
      * Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
      * Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.
      * Neither the name of the Oleg Grenrus nor the
        names of its contributors may be used to endorse or promote products
        derived from this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
  DISCLAIMED. IN NO EVENT SHALL OLEG GRENRUS BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
(function () {
  "use strict";

  function transform(contents) {
    var tokenSpecs = (function (){
      function f(type) {
        return function(m) {
          return { type: type, match: m[0] };
        };
      }

      function fStringSingle(m) {
        // String in single quotes
        var content = m[1].replace(/([^'\\]|\\['bnrt\/]|\\u[0-9a-fA-F]{4})/g, function (m) {
          if (m === '"') {
            return '\\"';
          } else if (m === "\\'") {
            return "'";
          } else {
            return m;
          }
        });
        return { type: "string", match: '"' + content + '"' };
      }

      function fIdentifier(m) {
        // identifiers are transformed into strings
        return { type: "string", match: '"' + m[0] + '"' };
      }

      function fComment(m) {
        // comments are whitespace, leave only linefeeds
        return { type: " ", match: m[0].replace(/./g, function (c) {
			return /\s/.test(c) ? c : ' ';
		}) };
      }

      return [
        { re: /^\s+/, f: f(" ") },
        { re: /^\{/, f: f("{") },
        { re: /^\}/, f: f("}") },
        { re: /^\[/, f: f("[") },
        { re: /^\]/, f: f("]") },
        { re: /^,/, f: f(",") },
        { re: /^:/, f: f(":") },
        { re: /^(true|false|null)/, f: f("keyword") },
        { re: /^\-?\d+(\.\d+)?([eE][+-]?\d+)?/, f: f("number") },
        { re: /^"([^"\\]|\\["bnrt\/]|\\u[0-9a-fA-F]{4})*"/, f: f("string") },
        // additional stuff
        { re: /^'(([^'\\]|\\['bnrt\/]|\\u[0-9a-fA-F]{4})*)'/, f: fStringSingle },
        { re: /^[a-zA-Z_\-+][a-zA-Z0-9_\-+]*/, f: fIdentifier },
        { re: /^\/\/.*?\n/, f: fComment },
        { re: /^\/\*[\s\S]*?\*\//, f: fComment },
      ];
    }());

    // slightly different from ES5 some, without cast to boolean
    // [x, y, z].some(f):
    // ES5:  !! ( f(x) || f(y) || f(z) || false)
    // this:    ( f(x) || f(y) || f(z) || false)
    function some(array, f) {
      if (array.length === 0) {
        return false;
      }

      var acc;
      for (var i = 0; i < array.length; i++) {
        acc = f(array[i], i, array);
        if (acc) {
          return acc;
        }
      }
      return acc;
    }

    // Tokenize contents
    var tokens = (function (contents) {
      var tokens = [];
      var line = 1; // TODO

      function findToken() {
        return some(tokenSpecs, function (tokenSpec) {
          var m = tokenSpec.re.exec(contents);
          if (m) {
            var matched = m[0];
            contents = contents.slice(matched.length);
            return tokenSpec.f(m);
          }
        });
      }

      while (contents !== "") {
        var matched = findToken();


        if (!matched) {
          throw new Error("Cannot tokenize on line " + line);
        } else {
          // count lines
          line += matched.match.replace(/[^\n]/g, '').length;
        }

        tokens.push(matched);
      }

      return tokens;
    }(contents));

    // remove trailing commas
    tokens = tokens.reduce(function (tokens, token) {
      // not so functional, js list aren't

      // do stuff only if curren token is ] or }
      if (tokens.length !== 0 && (token.type === ']' || token.type === '}')) {
        var i = tokens.length - 1;

        // go backwards as long as there is whitespace, until first comma
        while (true) {
          if (tokens[i].type === ' ') {
            i -= 1;
            continue;
          } else if (tokens[i].type === ',') {
            // remove comma
            tokens.splice(i, 1);
          }
          break;
        }
      }

      // push current token in place
      tokens.push(token);

      return tokens;
    }, []);

    // concat stuff
    return tokens.reduce(function (str, token) {
      return str + token.match;
    }, "");
  }

  // Export  stuff
  if (typeof window !== "undefined") {
    /* global window */
    window.EJSON = {
      transform: transform,
    };
  } else if (typeof exports !== "undefined") {
    /* global exports */
    exports.transform = transform;
  }
}());
