# Relaxed JSON

Are you frustrated that you cannot add comments into your configuration JSON
Relaxed JSON is a simple solution.
Small JavaScript library with only one exposed function `RJSON.transform(text : string) : string`
(and few convenient helpers).

[Relaxed JSON](http://oleg.fi/relaxed-json) (modified BSD license) is a strict superset of JSON,
relaxing strictness of valilla JSON.
Valid, vanilla JSON will not be changed by `RJSON.transform`. But there are few additional
features helping writing JSON by hand.

* Comments are stripped : `// foo` and `/* bar */`  → `     `.
  Comments are converted into whitespace, so your formatting is preserved.
* Trailing comma is allowed : `[1, 2, 3, ]` → `[1, 2, 3]`. Works also in objects `{ "foo": "bar", }` → `{ "foo": "bar" }`.
* Identifiers are transformed into strings : `{ foo: bar }` → `{ "foo": "bar" }`.
* Single quoted strings are allowed : `'say "Hello"'` → `"say \"Hello\""`.
* More different characters is supported in identifiers: `foo-bar` → `"foo-bar"`.

## API

- `RJSON.transform(text : string) : string`.
  Transforms Relaxed JSON text into JSON text. Doesn't verify (parse) the JSON, i.e result JSON might be invalid as well
- `RJSON.parse(text : string, reviver : function) : obj`.
  Parse the RJSON text, virtually `JSON.parse(JSON.transform(text), reviver)`.
- `RJSON.parse2(text : string, reviver : function) : obj`.
  This is self-made parser function, which should act as `RJSON.parse`, but provides better error messages.
