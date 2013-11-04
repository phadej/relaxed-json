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

  function tokenSpecs(relaxed) {
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

    function fKeyword(m) {
      var value;
      switch (m[1]) {
      case "null": value = null; break;
      case "true": value = true; break;
      case "false": value = false; break;
      }
      return {
        type: "atom",
        match: m[0],
        value: value,
      };
    }

    var ret = [
      { re: /^\s+/, f: f(" ") },
      { re: /^\{/, f: f("{") },
      { re: /^\}/, f: f("}") },
      { re: /^\[/, f: f("[") },
      { re: /^\]/, f: f("]") },
      { re: /^,/, f: f(",") },
      { re: /^:/, f: f(":") },
      { re: /^(true|false|null)/, f: fKeyword },
      { re: /^\-?\d+(\.\d+)?([eE][+-]?\d+)?/, f: fNumber },
      { re: /^"([^"\\]|\\["bnrtf\\]|\\u[0-9a-fA-F]{4})*"/, f: fStringDouble },
    ];

    // additional stuff
    if (relaxed) {
      ret = ret.concat([
        { re: /^'(([^'\\]|\\['bnrtf\\]|\\u[0-9a-fA-F]{4})*)'/, f: fStringSingle },
        { re: /^\/\/.*?\n/, f: fComment },
        { re: /^\/\*[\s\S]*?\*\//, f: fComment },
        { re: /^[a-zA-Z0-9_\-+\.\*\?!\|&%\^\/#\\]+/, f: fIdentifier },
      ]);
    }

    return ret;
  }

  var lexer = makeLexer(tokenSpecs(true));
  var strictLexer = makeLexer(tokenSpecs(false));

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

  function popToken(tokens, state) {
    var token = tokens[state.pos];
    state.pos += 1;

    if (!token) {
      var line = tokens.length !== 0 ? tokens[tokens.length - 1].line : 1;
      return { type: "eof", line: line };
    }

    return token;
  }

  function strToken(token) {
    switch (token.type) {
    case "atom":
    case "string":
    case "number":
      return token.type + " " + token.match;
    case "eof":
      return "end-of-file";
    default:
      return token.type;
    }
  }

  function skipColon(tokens, state) {
    var colon = popToken(tokens, state);
    if (colon.type !== ":") {
      var message = "Unexpected token: " + strToken(colon) + ", expected ':'";
      if (state.tolerant) {
        state.warnings.push({
          message: message,
          line: colon.line,
        });

        state.pos -= 1;
      } else {
        var err = new SyntaxError(message);
        err.line = colon.line;
        throw err;
      }
    }
  }

  function parseObject(tokens, state) {
    var token = popToken(tokens, state);
    var obj = {};
    var key, value;
    var err;
    var message;

    if (token.type !== "}" && token.type !== "string") {
      message = "Unexpected token: " + strToken(token) + ", expected '}' or string";

      if (state.tolerant) {
        state.warnings.push({
          message: message,
          line: token.line,
        });

        if (token.type !== "eof" && token.type !== "number" && token.type !== "atom") {
          state.pos -= 1;
        }

        if (token.type === "number" || token.type === "atom") {
          token = {
            type: "string",
            value: ""+token.value,
            line: token.line,
          };
        } else if (token.type === "eof") {
          token = {
            type: "}",
            line: token.line,
          };
        } else {
          token = {
            type: "string",
            value: "null",
            line: token.line,
          };
        }

      } else {
        err = new SyntaxError(message);
        err.line = token.line;
        throw err;
      }
    }

    switch (token.type) {
    case "}":
      return {};

    case "string":
      key = token.value;
      skipColon(tokens, state);
      value = parseAny(tokens, state);

      value = state.reviver ? state.reviver(key, value) : value;
      if (value !== undefined) {
        obj[key] = value;
      }
      break;
    }

    // Rest
    while (true) {
      token = popToken(tokens, state);

      if (token.type !== "}" && token.type !== ",") {
        message = "Unexpected token: " + strToken(token) + ", expected ',' or ']'";
        var newtype = token.type === "eof" ? "}" : ",";
        if (state.tolerant) {
          state.warnings.push({
            message: message + "; assuming '" + newtype + "'",
            line: token.line,
          });

          token = {
            type: newtype,
            line: token.line,
          };

          state.pos -= 1;
        } else {
          err = new SyntaxError(message);
          err.line = token.line;
          throw err;
        }
      }

      switch (token.type) {
      case "}":
        return obj;

      case ",":
        token = popToken(tokens, state);
        if (token.type !== "string") {
          message = "Unexpected token: " + strToken(token) + ", expected string";
          if (state.tolerant) {
            state.warnings.push({
              message: message,
              line: token.line,
            });

            if (token.type === "number" || token.type === "atom") {
              token = {
                type: "string",
                value: "" + token.value,
                line: token.line,
              };
            } else {
              token = {
                type: "string",
                value: "null",
                line: token.line,
              };

              state.pos -= 1;
            }
          } else {
            err = new SyntaxError(message);
            err.line = token.line;
            throw err;
          }
        }

        key = token.value;

        if (state.duplicate && Object.prototype.hasOwnProperty.call(obj, key)) {
          message = "Duplicate key: " + key;
          if (state.tolerant) {
            state.warnings.push({
              message: message,
              line: token.line,
            });
          } else {
            err = new SyntaxError(message);
            err.line = token.line;
            throw err;
          }
        }

        skipColon(tokens, state);
        value = parseAny(tokens, state);

        value = state.reviver ? state.reviver(key, value) : value;
        if (value !== undefined) {
          obj[key] = value;
        }
        break;
      }
    }
  }

  function parseArray(tokens, state) {
    var token = popToken(tokens, state);
    var arr = [];
    var key = 0, value;
    var err;
    var message;

    if (state.tolerant && token.type === "eof") {
      state.warnings.push({
        message: "Unexpected token: " + strToken(token) + ", expected ']' or json object",
        line: token.line,
      });
      token.type = "]";
    }

    switch (token.type) {
    case "]":
      return [];

    default:
      state.pos -= 1; // push the token back
      value = parseAny(tokens, state);

      arr[key] = state.reviver ? state.reviver("" + key, value) : value;
      break;
    }

    // Rest
    while (true) {
      token = popToken(tokens, state);

      if (token.type !== "]" && token.type !== ",") {
        message = "Unexpected token: " + strToken(token) + ", expected ',' or ']'";
        var newtype = token.type === "eof" ? "]" : ",";
        if (state.tolerant) {
          state.warnings.push({
            message: message + "; assuming '" + newtype + "'",
            line: token.line,
          });

          token = {
            type: newtype,
            line: token.line,
          };

          state.pos -= 1;
        } else {
          err = new SyntaxError(message);
          err.line = token.line;
          throw err;
        }
      }

      switch (token.type) {
        case "]":
          return arr;

        case ",":
          key += 1;
          value = parseAny(tokens, state);
          arr[key] = state.reviver ? state.reviver("" + key, value) : value;
          break;
      }
    }
  }

  function parseAny(tokens, state, end) {
    var token = popToken(tokens, state);
    var ret;
    var err;
    var message;

    switch (token.type) {
    case "{":
      ret = parseObject(tokens, state);
      break;
    case "[":
      ret = parseArray(tokens, state);
      break;
    case "string":
    case "number":
    case "atom":
      ret = token.value;
      break;
    default:
      message = "Unexpected token: " + strToken(token) + ", expected '[', '{', number, string or atom";
      if (state.tolerant) {
        state.warnings.push({
          message: message + "; assuming null",
          line: token.line,
        });
        ret = null;
      } else {
        err = new SyntaxError();
        err.line = token.line;
        throw err;
      }
    }

    if (end) {
      ret = state.reviver ? state.reviver("", ret) : ret;
    }

    if (end && state.pos < tokens.length) {
      message = "Unexpected token: " + strToken(tokens[state.pos]) + ", expected end-of-input";
      if (state.tolerant) {
        state.warnings.push({
          message: message,
          line: tokens[state.pos].line,
        });
      } else {
        err = new SyntaxError(message);
        err.line = tokens[state.pos].line;
        throw err;
      }
    }

    // Throw error at the end
    if (end && state.tolerant && state.warnings.length !== 0) {
      message = state.warnings.length === 1 ? state.warnings[0].message : state.warnings.length + " parse warnings";
      err = new SyntaxError(message);
      err.line = state.warnings[0].line;
      err.warnings = state.warnings;
      err.obj = ret;
      throw err;
    }

    return ret;
  }

  function parse(text, opts) {
    if (typeof opts === "function" || opts === undefined) {
      return JSON.parse(transform(text), opts);
    } else if (new Object(opts) !== opts) {
      throw new TypeError("opts/reviver should be undefined, a function or an object");
    }

    opts.relaxed = opts.relaxed !== undefined ? opts.relaxed : true;
    opts.warnings = opts.warnings || opts.tolerant || false;
    opts.tolerant = opts.tolerant || false;
    opts.duplicate = opts.duplicate || false;

    if (!opts.warnings && !opts.relaxed) {
      return JSON.parse(text, opts.reviver);
    }

    var tokens = opts.relaxed ? lexer(text) : strictLexer(text);

    if (opts.relaxed) {
      // Strip commas
      tokens = transformTokens(tokens);
    }

    if (opts.warnings) {
      // Strip whitespace
      tokens = tokens.filter(function (token) {
        return token.type !== " ";
      });

      var state = { pos: 0, reviver: opts.reviver, tolerant: opts.tolerant, duplicate: opts.duplicate, warnings: [] };
      return parseAny(tokens, state, true);
    } else {
      var newtext = tokens.reduce(function (str, token) {
        return str + token.match;
      }, "");

      return JSON.parse(newtext, opts.reviver);
    }
  }

  // Export  stuff
  var RJSON = {
    transform: transform,
    parse: parse,
  };

  /* global window, module */
  if (typeof window !== "undefined") {
    window.RJSON = RJSON;
  } else if (typeof module !== "undefined") {
    module.exports = RJSON;
  }
}());
