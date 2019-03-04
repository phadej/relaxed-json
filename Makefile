all : test

.PHONY : all test jshint eslint mocha istanbul david dist

BINDIR=node_modules/.bin

MOCHA=$(BINDIR)/_mocha
ISTANBUL=$(BINDIR)/nyc
JSHINT=$(BINDIR)/jshint
ESLINT=$(BINDIR)/eslint
UGLIFY=$(BINDIR)/uglifyjs
DAVID=$(BINDIR)/david
JSCS=$(BINDIR)/jscs

SRC=relaxed-json.js bin/rjson.js

test : eslint mocha istanbul david

eslint :
	$(ESLINT) $(SRC)

mocha :
	$(MOCHA) --reporter=spec test

istanbul :
	$(ISTANBUL) $(MOCHA) test
	$(ISTANBUL) check-coverage --statements -1 --branches -2 --functions 100 --lines -1

uglify : relaxed-json.js
	$(UGLIFY) relaxed-json.js -o relaxed-json.min.js --source-map

david :
	$(DAVID)

dist : test uglify
	git clean -fdx -e node_modules
