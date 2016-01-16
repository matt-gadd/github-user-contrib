"use strict";

module.exports = function (options) {
	var regExp = new RegExp(["buildbot test build"].join("|"), "i");
	return function (results) {
		results.users.forEach(function (user) {
			user.for = user.for.filter(function (comment) {
				return !regExp.test(comment.body);
			});

			user.against = user.against.filter(function (comment) {
				return !regExp.test(comment.body);
			});
		});
		return results;
	};
};
