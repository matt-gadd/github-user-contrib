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

		comment.filtered = filtered;
		return !filtered;
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
