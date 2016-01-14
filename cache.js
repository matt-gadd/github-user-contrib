"use strict";
var fs = require("fs");
var Promise = require('bluebird');
var config = require("./config");
var cache = {};
var _get;

function _formatRepoName(repo) {
	return repo.split(":")[0].replace("/", "-").toLowerCase();
}

function get(url, repo) {
	repo = _formatRepoName(repo);
	if (cache[repo] && cache[repo][url]) {
		return Promise.resolve(cache[repo][url]);
	} else {
		if (!cache[repo]) {
			cache[repo] = {};
		}
		console.log(url);
		return cache[repo][url] = _get({
			uri: url,
			json: true
		});
	}
}

function dump() {
	Object.keys(cache).forEach((repo) => {
		var cacheDump = {};
		Object.keys(cache[repo]).forEach((url) => {
			if (!cacheDump[repo]) {
				cacheDump[repo] = {};
			}
			cacheDump[repo][url] = Promise.resolve(cache[repo][url]).spread((response, body) => {
				return [response, body];
			});
		});
		return Promise.props(cacheDump[repo]).then((results) => {
			fs.writeFile("cache/cache-" + repo + ".json", JSON.stringify(results, null, "\t"), function (err) {
				if (err) throw err;
				console.log('cache for repo', repo, 'saved!');
			});
		});
	});
}

function load() {
	config.repos.forEach((repo) => {
		repo = _formatRepoName(repo);
		try {
			var cacheRaw = fs.readFileSync("cache/cache-" + repo + ".json", 'utf8');
			cache[repo] = JSON.parse(cacheRaw);
		} catch (e) {
		}
	});
}

module.exports = function (req) {
	_get = req;
	var cache = get;
	cache.dump = dump;
	cache.load = load;
	return cache;
};
