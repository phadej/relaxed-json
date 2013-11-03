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

  // slightly different from ES5 some, without cast to boolean
  // [x, y, z].some(f):
  // ES5:  !! ( f(x) || f(y) || f(z) || false)
  // this:    ( f(x) || f(y) || f(z) || false)
  function some(array, f) {
    var acc = false;
    for (var i = 0; i < array.length; i++) {
      acc = f(array[i], i, array);
      if (acc) {
        return acc;
      }
    }
    return acc;
  }

  function makeLexer(tokenSpecs) {
    return function (contents) {
      var tokens = [];
      var line = 1;

      function findToken() {
        return some(tokenSpecs, function (tokenSpec) {
          var m = tokenSpec.re.exec(contents);
          if (m) {
            var raw = m[0];
            contents = contents.slice(raw.length);
            return {
              raw: raw,
              matched: tokenSpec.f(m, line),
            };
          }
        });
      }

      while (contents !== "") {
        var matched = findToken();

        if (!matched) {
          var err = new SyntaxError("Unexpected character: " + contents[0]);
          err.line = line;
          throw err;
        }

        // add line to token
        matched.matched.line = line;

        // count lines
        line += matched.raw.replace(/[^\n]/g, "").length;

        tokens.push(matched.matched);
      }

      return tokens;
    };
  }

  var tokenSpecs = (function (){
    function f(type) {
      return function(m) {
        return { type: type, match: m[0] };
      };
    }

    function fStringSingle(m) {
      // String in single quotes
      var content = m[1].replace(/([^'\\]|\\['bnrtf\\]|\\u[0-9a-fA-F]{4})/g, function (m) {
        if (m === "\"") {
          return "\\\"";
        } else if (m === "\\'") {
          return "'";
        } else {
          return m;
        }
      });

      return {
        type: "string",
        match: "\"" + content + "\"",
        value: JSON.parse("\"" + content + "\""), // abusing real JSON.parse to unquote string
      };
    }

    function fStringDouble(m) {
      return {
        type: "string",
        match: m[0],
        value: JSON.parse(m[0]),
      };
    }

    function fIdentifier(m) {
      // identifiers are transformed into strings
      return {
        type: "string",
        value: m[0],
        match: "\"" + m[0].replace(/./g, function (c) {
        return c === "\\" ? "\\\\" : c;
      }) + "\"" };
    }

    function fComment(m) {
      // comments are whitespace, leave only linefeeds
      return { type: " ", match: m[0].replace(/./g, function (c) {
        return (/\s/).test(c) ? c : " ";
      }) };
    }

    function fNumber(m) {
      return {
        type : "number",
        match: m[0],
        value: parseFloat(m[0]),
      };
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
      { re: /^\-?\d+(\.\d+)?([eE][+-]?\d+)?/, f: fNumber },
      { re: /^"([^"\\]|\\["bnrtf\\]|\\u[0-9a-fA-F]{4})*"/, f: fStringDouble },
      // additional stuff
      { re: /^'(([^'\\]|\\['bnrtf\\]|\\u[0-9a-fA-F]{4})*)'/, f: fStringSingle },
      { re: /^\/\/.*?\n/, f: fComment },
      { re: /^\/\*[\s\S]*?\*\//, f: fComment },
      { re: /^[a-zA-Z0-9_\-+\.\*\?!\|&%\^\/#\\]+/, f: fIdentifier },
    ];
  }());

  var lexer = makeLexer(tokenSpecs);

  function transformTokens(tokens) {
    return tokens.reduce(function (tokens, token) {
      // not so functional, js list aren't

      // do stuff only if curren token is ] or }
      if (tokens.length !== 0 && (token.type === "]" || token.type === "}")) {
        var i = tokens.length - 1;

        // go backwards as long as there is whitespace, until first comma
        while (true) {
          if (tokens[i].type === " ") {
            i -= 1;
            continue;
          } else if (tokens[i].type === ",") {
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
  }

  function transform(text) {
    // Tokenize contents
    var tokens = lexer(text);

    // remove trailing commas
    tokens = transformTokens(tokens);

    // concat stuff
    return tokens.reduce(function (str, token) {
      return str + token.match;
    }, "");
  }

  function parse(text, reviver) {
    return JSON.parse(transform(text), reviver);
  }

  function popToken(tokens) {
    var token = tokens.shift();
    if (!token) {
       var err = new SyntaxError("Unexpected end-of-file");
      throw err;
    }
    return token;
  }

  function parseObject(tokens, reviver) {
    var token = popToken(tokens);
    var obj = {};
    var key, colon, value;
    var err;

    switch (token.type) {
    case "}":
      return {};

    case "string":
      key = token.value;
      colon = popToken(tokens);
      if (colon.type !== ":") {
        err = new SyntaxError("Unexpected token: " + colon.type + ", expected colon");
        err.line = token.line;
        throw err;
      }
      value = parseAny(tokens, reviver);

      value = reviver ? reviver(key, value) : value;
      if (value !== undefined) {
        obj[key] = value;
      }
      break;

    default:
      err = new SyntaxError("Unexpected token: " + token.type + ", expected string or }");
      err.line = token.line;
      throw err;
    }

    // Rest
    while (true) {
      token = popToken(tokens);

      switch (token.type) {
      case "}":
        return obj;

      case ",":
        token = popToken(tokens);
        if (token.type !== "string") {
          err = new SyntaxError("Unexpected token: " + token.type + ", expected string");
          err.line = token.line;
          throw err;
        }
        key = token.value;
        colon = popToken(tokens);
        if (colon.type !== ":") {
          err = new SyntaxError("Unexpected token: " + colon.type + ", expected colon");
          err.line = token.line;
          throw err;
        }
        value = parseAny(tokens, reviver);

        value = reviver ? reviver(key, value) : value;
        if (value !== undefined) {
          obj[key] = value;
        }
        break;

        default:
          err = new SyntaxError("Unexpected token: " + token.type + ", expected , or }");
          err.line = token.line;
          throw err;
      }
    }
  }

  function parseArray(tokens, reviver) {
    var token = popToken(tokens);
    var arr = [];
    var key = 0, value;
    var err;

    switch (token.type) {
    case "]":
      return [];

    default:
      tokens.unshift(token);
      value = parseAny(tokens, reviver);

      arr[key] = reviver ? reviver("" + key, value) : value;
      break;
    }

    // Rest
    while (true) {
      token = popToken(tokens);

      switch (token.type) {
        case "]":
          return arr;

        case ",":
          key += 1;
          value = parseAny(tokens, reviver);
          arr[key] = reviver ? reviver("" + key, value) : value;
          break;

        default:
          err = new SyntaxError("Unexpected token: " + token.type + ", expected , or }");
          err.line = token.line;
          throw err;
      }
    }
  }

  function parseAny(tokens, reviver, end) {
    var token = popToken(tokens);
    var ret;
    var err;

    switch (token.type) {
    case "{":
      ret = parseObject(tokens, reviver);
      break;
    case "[":
      ret = parseArray(tokens, reviver);
      break;
    case "string":
    case "number":
      ret = token.value;
      break;
    case "keyword":
      switch (token.match) {
        case "null": ret = null; break;
        case "true": ret = true; break;
        case "false": ret = false; break;
      }
      break;
    default:
      err = new SyntaxError("Unexpected token: " + token.type);
      err.line = token.line;
      throw err;
    }

    if (end) {
      ret = reviver ? reviver("", ret) : ret;
    }

    if (end && tokens.length !== 0) {
      err = new SyntaxError("Unexpected token: " + tokens[0].type + ", expected end-of-input");
      err.line = tokens[0].line;
      throw err;
    }

    return ret;
  }

  function parse2(text, reviver) {
    // Tokenize contents
    var tokens = lexer(text);

    // remove trailing commas
    tokens = transformTokens(tokens);

    tokens = tokens.filter(function (token) {
      return token.type !== " ";
    });

    // concat stuff
    return parseAny(tokens, reviver, true);
  }

  // Export  stuff
  var module = {
    transform: transform,
    parse: parse,
    parse2: parse2,
  };

  /* global window, exports */
  if (typeof window !== "undefined") {
    window.RJSON = module;
  } else if (typeof exports !== "undefined") {
    for (var k in module) {
      // Check to make jshint happy
      if (Object.prototype.hasOwnProperty.call(module, k)) {
        exports[k] = module[k];
      }
    }
  }
}());
