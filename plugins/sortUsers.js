"use strict";
var _ = require("lodash");

module.exports = function (options) {
	return function (results) {
		results.users.sort(function (a, b) {
			if (_.get(a, options.sortField) > _.get(b, options.sortField)) {
				return 1;
			}
			if (_.get(a, options.sortField) < _.get(b, options.sortField)) {
				return -1;
			}
			return 0;
		});

		if (options.reverse) {
			results.users.reverse();
		}

		return results;
	}
};
