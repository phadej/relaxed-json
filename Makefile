all : test

.PHONY : all test jshint mocha istanbul dist

BINDIR=node_modules/.bin/

MOCHA=$(BINDIR)/_mocha
ISTANBUL=$(BINDIR)/istanbul
JSHINT=$(BINDIR)/jshint
UGLIFY=$(BINDIR)/uglifyjs

test : jshint mocha istanbul

jshint :
	$(JSHINT) relaxed-json.js

mocha : 
	$(MOCHA) --reporter=spec test

istanbul :
	$(ISTANBUL) cover $(MOCHA) test
	$(ISTANBUL) check-coverage --statements -1 --branches -2 --functions 100 --lines -1

uglify : relaxed-json.js
	$(UGLIFY) -o relaxed-json.min.js --source-map relaxed-json.min.js.map relaxed-json.js

dist : test uglify
	git clean -fdx -e node_modules
