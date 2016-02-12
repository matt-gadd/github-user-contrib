"use strict";
module.exports = function (options) {

	function filterComment(comment) {
		let commentLength = comment.body.replace(/(:.*?:)*/g, "").trim().length;
		if (options.filterIssueOnly) {
			let result = (commentLength && comment.path) || commentLength > options.minlength;
			if (!result) {
				comment.filtered = true;
			}
			return result;
		}
		return commentLength > options.minlength;
	}

	return function (results) {
		results.users.forEach((user) => {
			user.repos.forEach((repo) => {
				repo.againstFiltered = repo.against.filter(filterComment);
				repo.forFiltered = repo.for.filter(filterComment);
			});
		});
		return results;
	};
};
