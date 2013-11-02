Are you frustrated that you cannot add comments into your example JSON
structure or easily strip them? Relaxed JSON is a simple solution. Small
JavaScript library with only one exposed function `EJSON.transform /* string → string */`.

[Relaxed JSON](http://oleg.fi/relaxed-json) (modified BSD license) is a strict superset of JSON. Valid JSON
will not be changed by `RJSON.transform`. But in addition there are few
extensions helping writing JSON by hand.

* Comments are stripped : `// foo` and `/* bar */`  → `     `. Comments are converted into whitespace, so your formatting is preserved.
* Trailing comma is allowed : `[1, 2, 3, ]` → `[1, 2, 3]`. Works also in objects `{ "foo": "bar", }` → `{ "foo": "bar" }`.
* Identifiers are transformed into strings : `{ foo: bar }` → `{ "foo": "bar" }`.
* Single quoted strings are allowed : `'say "Hello"'` → `"say \"Hello\""`.
