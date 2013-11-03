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

  describe("relaxations", function () {
    it("handles trailing comma", function () {
      assert.deepEqual(rjson.parse("[1, 2, 3, ]"), [1, 2, 3]);
    });

    it("transforms identifiers into strings", function () {
      assert.deepEqual(rjson.parse("foo-bar"), "foo-bar");
      assert.deepEqual(rjson.parse("foo\\bar"), "foo\\bar");
    });

    it("handles single quoted strings", function () {
      assert.deepEqual(rjson.parse("'foo-bar'"), "foo-bar");
      assert.deepEqual(rjson.parse("'foo\"bar'"), "foo\"bar");
      assert.deepEqual(rjson.parse("'foo\\'bar'"), "foo'bar");
    });

    it("strips line comments", function () {
      assert.deepEqual(rjson.parse("[ true,  // comment\n false]"), [true, false]);
    });

    it("strips multi-line comments", function () {
      assert.deepEqual(rjson.parse("[ true,  /* comment \n  */ false]"), [true, false]);
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

describe("parse2()", function () {
  it("should parse everything JSON.parse does", function () {
    var property = jsc.forall(jsc.value(), function (x) {
      var t = JSON.stringify(x, null, 2);
      return _.isEqual(rjson.parse2(t), JSON.parse(t));
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

      var rjsonParsed = rjson.parse2(t, rjsonReviver);
      var jsonParsed = JSON.parse(t, jsonReviver);

      return _.isEqual(rjsonParsed, jsonParsed) && _.isEqual(rjsonCalls, jsonCalls);
    });

    jsc.assert(property, jscOpts);
  });

  it("parses atoms", function () {
    assert.deepEqual(rjson.parse2("null"), null);
    assert.deepEqual(rjson.parse2("true"), true);
    assert.deepEqual(rjson.parse2("false"), false);
  });

  it("removes values from objects, if reviver returns undefined", function () {
    var input = "{ \"foo\": 1, \"bar\": 2, \"quux\": 3 }";
    function reviver(k, v) {
      if (typeof v !== "number") { return v; }
      return v % 2 === 0 ? v : undefined;
    }
    assert.deepEqual(JSON.parse(input, reviver), { bar : 2});
    assert.deepEqual(rjson.parse2(input, reviver), { bar : 2});
  });

  function errorCases(parse) {
    it("throws on empty input", function () {
      assert.throws(function () {
        parse(" ");
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

  describe("error cases - rjson.parse2", function () {
    errorCases(rjson.parse2);
  });

  describe("error cases - JSON.parse, verify", function () {
    errorCases(JSON.parse);
  });
});