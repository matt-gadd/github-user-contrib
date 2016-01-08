"use strict";
var fs = require("fs");
var Promise = require('bluebird');
var cache = {};
var _get;

function get(url) {
	if (cache[url]) {
		return Promise.resolve(cache[url]);
	} else {
		console.log(url);
		return cache[url] = _get({
			uri: url,
			json: true
		});
	}
}

function dump() {
	var cacheDump = {};
	Object.keys(cache).forEach(function (url) {
		cacheDump[url] = Promise.resolve(cache[url]).spread(function (response, body) {
			return [response, body];
		});
	});
	return Promise.props(cacheDump).then(function (results) {
		fs.writeFile("cache.json", JSON.stringify(results, null, "\t"), function (err) {
			if (err) throw err;
			console.log('It\'s saved!');
		});
	});
}

function load() {
	try {
		var cacheRaw = fs.readFileSync("cache.json", 'utf8');
		cache = JSON.parse(cacheRaw);
	} catch (e) {
	}
}

module.exports = function (req) {
	_get = req;
	var cache = get;
	cache.dump = dump;
	cache.load = load;
	return cache;
}
