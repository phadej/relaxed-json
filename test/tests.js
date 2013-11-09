/* global describe, it */
"use strict";

var jsc = require("jsverify");
var assert = require("assert");
var _ = require("underscore");

var jscOpts = {
  quiet: true,
  size: 10,
  tests: 500,
};

var rjson = require("../relaxed-json.js");

describe("transform()", function () {
  it("should handle '\"\\\\n\\\\t\\\\b\\\\r\\\\f\"'", function () {
    var x = "\"\\n\\t\\b\\r\\f\"";
    assert(x === rjson.transform(x));
  });

  it("should not change any valid json", function () {
    var property = jsc.forall(jsc.value(), function (x) {
      var t = JSON.stringify(x);
      try {
        return t === rjson.transform(t);
      } catch (e) {
        console.error(e, t);
        return false;
      }
    });

    jsc.assert(property, jscOpts);
  });

  it("should not change any valid json, whitespaces", function () {
    var property = jsc.forall(jsc.value(), function (x) {
      var t = JSON.stringify(x, null, 2);
      return t === rjson.transform(t);
    });

    jsc.assert(property, jscOpts);
  });

  function relaxation(input, expected) {
    assert.deepEqual(rjson.parse(input), expected);
    assert.throws(function () {
      JSON.parse(input);
    });
    assert.throws(function () {
      rjson.parse3(input);
    });
  }

  describe("relaxations", function () {
    it("handles trailing comma", function () {
      relaxation("[1, 2, 3, ]", [1, 2, 3]);
    });

    it("transforms identifiers into strings", function () {
      relaxation("foo-bar", "foo-bar");
      relaxation("foo\\bar", "foo\\bar");
    });

    it("handles single quoted strings", function () {
      relaxation("'foo-bar'", "foo-bar");
      relaxation("'foo\"bar'", "foo\"bar");
      relaxation("'foo\\'bar'", "foo'bar");
    });

    it("strips line comments", function () {
      relaxation("[ true,  // comment\n false]", [true, false]);
    });

    it("strips multi-line comments", function () {
      relaxation("[ true,  /* comment \n  */ false]", [true, false]);
    });
  });

  describe("error cases", function () {
    it("fails when unexpected character found", function () {
      assert.throws(function () {
        rjson.transform("\x00");
      });
    });
  });
});

describe("parse()", function () {
  it("should parse everything JSON.parse does", function () {
    var property = jsc.forall(jsc.value(), function (x) {
      var t = JSON.stringify(x, null, 2);
      return _.isEqual(rjson.parse(t), JSON.parse(t));
    });

    jsc.assert(property, jscOpts);
  });
});

describe("parse() with opts { warnings: true } ", function () {
  it("should parse everything JSON.parse does", function () {
    var property = jsc.forall(jsc.value(), function (x) {
      var t = JSON.stringify(x, null, 2);
      return _.isEqual(rjson.parse(t, { warnings: true }), JSON.parse(t));
    });

    jsc.assert(property, jscOpts);
  });

  it("calls reviver as JSON.parse does", function () {
    var property = jsc.forall(jsc.value(), function (x) {
      var t = JSON.stringify(x, null, 2);
      var rjsonCalls = [];
      var jsonCalls = [];

      function rjsonReviver(k, v) {
        rjsonCalls.push([k, v]);
        return v;
      }

      function jsonReviver(k, v) {
        jsonCalls.push([k, v]);
        return v;
      }

      var rjsonParsed = rjson.parse(t, { warnings: true, reviver: rjsonReviver });
      var jsonParsed = JSON.parse(t, jsonReviver);

      return _.isEqual(rjsonParsed, jsonParsed) && _.isEqual(rjsonCalls, jsonCalls);
    });

    jsc.assert(property, jscOpts);
  });

  it("parses atoms", function () {
    assert.deepEqual(rjson.parse("null", { warnings: true }), null);
    assert.deepEqual(rjson.parse("true", { warnings: true }), true);
    assert.deepEqual(rjson.parse("false", { warnings: true }), false);
  });

  it("removes values from objects, if reviver returns undefined", function () {
    var input = "{ \"foo\": 1, \"bar\": 2, \"quux\": 3 }";
    function reviver(k, v) {
      if (typeof v !== "number") { return v; }
      return v % 2 === 0 ? v : undefined;
    }
    assert.deepEqual(JSON.parse(input, reviver), { bar : 2});
    assert.deepEqual(rjson.parse(input, { warnings: true , reviver: reviver }), { bar : 2});
  });

  describe("duplicate keys", function () {
    it("by default doesn't warn", function () {
      assert(rjson.parse("{\"foo\": 0, \"foo\": 1}"), { foo: 1 });
      assert(JSON.parse("{\"foo\": 0, \"foo\": 1}"), { foo: 1 });
    });

    it("warns when turned warnings or tolerate is turned on", function () {
      assert.throws(function () {
        rjson.parse("{\"foo\": 0, \"foo\": 1}", { duplicate: true, warnings: true });
      });

      assert.throws(function () {
        rjson.parse("{\"foo\": 0, \"foo\": 1}", { duplicate: true, tolerant: true });
      });
    });
  });

  describe("tolerant parser", function () {
    function tolerates(value, expected) {
      it("tolerates " + value, function () {
        var thrown = false;
        try {
            rjson.parse(value, { tolerant: true });
        } catch (e) {
          thrown = true;
          assert.deepEqual(e.obj, expected);
        }

        assert(thrown, "should throw");
      });
    }

    tolerates("[[[", [[[]]]);
    tolerates("{", {});
    tolerates("{ 0 1 2 3", { "0": 1, "2": 3 });
    tolerates("{[", { "null": [] });
    tolerates("{{", { "null": {} });
    tolerates("{ 0 0 :foo }", { "0": "0", "null": "foo"});
    tolerates("{ :foo }", { "null": "foo"});
    tolerates("{{{", { "null": { "null": {} } });
    tolerates("{ true 1 {", { "true": 1, "null": {} });
    tolerates("{ 0 0 0 1 }", { "0" : 1, });
    tolerates("[,", []);
    tolerates("[,,,,]", []);
    tolerates("{,0 1,,,}", { "0": 1 });
    tolerates("{,0 1,,,2 3}", { "0": 1, "2": 3 });

    it("handles json without colons and commas", function () {
      function noCommaColon(v) {
         if (typeof v === "string") {
          return !/[,:]/.test(v);

        } else if (Array.isArray(v)) {
          return v.every(noCommaColon);

        } else if (new Object(v) === v) {
          var keys = Object.keys(v);
          return keys.every(noCommaColon) &&
            keys.map(function (k) { return v[k]; }).every(noCommaColon);

        } else {
          return true;
        }
      }

      var jsonNoCommaColon = jsc.suchthat(jsc.value(), noCommaColon) ;

      var property = jsc.forall(jsonNoCommaColon, function (x) {
        var t = JSON.stringify(x, null, 2).replace(/[,:]/g, " ");

        var p;
        try {
          p = rjson.parse(t, { tolerant: true, relaxed: false });
        } catch (e) {
          p = e.obj;
        }

        return _.isEqual(p, x);
      });

      jsc.assert(property, jscOpts);
    });
  });

  function errorCases(parse) {
    it("throws on empty input", function () {
      assert.throws(function () {
        parse(" ");
      });
    });

    it("throws on [,]", function () {
      assert.throws(function () {
        parse("[,]");
      });
    });

    it("throws on unexpected token at beginning", function () {
      assert.throws(function () {
        parse("}");
      });
    });

    it("throws if tokens at the end", function () {
      assert.throws(function () {
        parse("{}{");
      });
    });

    it("throws if not string after {", function () {
      assert.throws(function () {
        parse("{ 1: true }");
      });
    });

    it("throws if not colon after key", function () {
      assert.throws(function () {
        parse("{ \"foo\" 1 }");
      });
    });

    it("throws if not comma or } after pair", function () {
      assert.throws(function () {
        parse("{ \"foo\": 1 2");
      });
    });

    it("throws if not string after pair", function () {
      assert.throws(function () {
        parse("{ \"foo\": 1, 2 }");
      });
    });

    it("throws if not colon after pair and key", function () {
      assert.throws(function () {
        parse("{ \"foo\": 1, \"bar\" 2 }");
      });
    });

    it("throws if not comma or ] after obj in array", function () {
      assert.throws(function () {
        parse("[1 2]");
      });
    });
  }

  describe("error cases - rjson.parse", function () {
    it("throws if secodn parameter is not an object or a function", function () {
      assert.throws(function () {
        rjson.parse("[1, 2]", true);
      });
    });

    errorCases(rjson.parse);
  });

  describe("error cases - rjson.parse {}", function () {
    errorCases(function (text) {
      return rjson.parse(text, {});
    });
  });

  describe("error cases - rjson.parse { relaxed: false }", function () {
    errorCases(function (text) {
      return rjson.parse(text, { relaxed: false });
    });
  });

  describe("error cases - rjson.parse { relaxed: false, tolerant: true }", function () {
    errorCases(function (text) {
      return rjson.parse(text, { relaxed: false, tolerant: true });
    });
  });

  describe("error cases - rjson.parse { warnings: true }", function () {
    errorCases(function (text) {
      return rjson.parse(text, { warnings: true });
    });
  });

  describe("error cases - rjson.parse { relaxed: false, warnings: true }", function () {
    errorCases(function (text) {
      return rjson.parse(text, { relaxed: false, warnings: true });
    });
  });

  describe("error cases - JSON.parse, verify", function () {
    errorCases(JSON.parse);
  });
});
