"use strict";

module.exports = function (options) {
	var regExp;
	options = options || {};
	options.excludes = options.excludes || [];
	regExp = new RegExp(options.excludes.join("|"), "i");
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
