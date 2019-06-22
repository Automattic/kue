REPORTER = spec

all:    build

build:
	@./node_modules/coffee-script/bin/coffee \
		--exit \
    -c \
    -o lib src

test-tdd:
	@./node_modules/.bin/mocha \
		--exit \
    --reporter $(REPORTER) \
		--require should \
		--require sinon \
    --ui tdd \
    test/tdd/*.js

test-bdd:
	@./node_modules/.bin/mocha \
		--exit \
    --reporter $(REPORTER) \
    --require should \
    --ui bdd \
    test/*.js

test-bdd-coffee:
	@./node_modules/.bin/mocha \
		--exit \
    --reporter $(REPORTER) \
    --require coffee-script/register \
    --require should \
    --ui bdd \
    test/*.coffee


test-all:   test-tdd test-bdd test-bdd-coffee

.PHONY: test-all
