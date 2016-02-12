"use strict";
module.exports = function (options) {

	function filterComment(comment) {
		let commentLength = comment.body.replace(/(:.*?:)*/g, "").trim().length;
		if (options.filterIssueOnly) {
			let keepComment = false;
			if (commentLength && comment.path) {
				keepComment = true;
			} else if (commentLength > options.minlength) {
				keepComment = true;
			}
			comment.filtered = !keepComment;
			return keepComment;
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
