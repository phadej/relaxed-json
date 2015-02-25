all : test

.PHONY : all test jshint eslint mocha istanbul david dist

BINDIR=node_modules/.bin

MOCHA=$(BINDIR)/_mocha
ISTANBUL=$(BINDIR)/istanbul
JSHINT=$(BINDIR)/jshint
ESLINT=$(BINDIR)/eslint
UGLIFY=$(BINDIR)/uglifyjs
DAVID=$(BINDIR)/david
JSCS=$(BINDIR)/jscs

SRC=relaxed-json.js bin/rjson.js

test : jshint eslint jscs mocha istanbul david

jshint :
	$(JSHINT) $(SRC)

eslint :
	$(ESLINT) $(SRC)

jscs :
	$(JSCS) $(SRC)

mocha : 
	$(MOCHA) --reporter=spec test

istanbul :
	$(ISTANBUL) cover $(MOCHA) test
	$(ISTANBUL) check-coverage --statements -1 --branches -2 --functions 100 --lines -1

uglify : relaxed-json.js
	$(UGLIFY) -o relaxed-json.min.js --source-map relaxed-json.min.js.map relaxed-json.js

david :
	$(DAVID)

dist : test uglify
	git clean -fdx -e node_modules
