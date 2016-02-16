"use strict";
module.exports = function (options) {

	function filterComment(comment) {
		let emojiRegex = /(:.*?:)/g;
		let hasEmoji = emojiRegex.test(comment.body);
		let excludedWords = ["merge", "merging"];
		let commentBody = comment.body.replace(emojiRegex, "").trim();
		let filtered = false;

		if (commentBody.length < options.minLength) {
			filtered = true;
		}

		if (hasEmoji && excludedWords.find(excludedWord => comment.body.includes(excludedWord))) {
			filtered = true;
		}

		if (options.filterIssueOnly && comment.path) {
			filtered = false;
		}

		if (!commentBody.length) {
			filtered = true;
		}

		comment.filtered = filtered;
		return !filtered;
	}

	return function (results) {
		results.users.forEach((user) => {
			user.repos.forEach((repo) => {
				repo.against.forEach(filterComment);
				repo.for.forEach(filterComment);
			});
		});
		return results;
	};
};
