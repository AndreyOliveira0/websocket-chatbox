const usernameText = document.getElementById('usernameText');
usernameText.value = getCookie('username');
console.log(usernameText.value);
function saveUsername() {
	setCookie('username', usernameText.value, 7);
	console.log(usernameText.value);
}

function setCookie(name, value, days) {
	let expires = "";
	if (days) {
		let date = new Date();
		date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
		expires = "; expires=" + date.toUTCString();
	}
	document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
}

function getCookie(name) {
	let cookies = document.cookie.split(';');
	for (let i = 0; i < cookies.length; i++) {
		let [cookieName, cookieValue] = cookies[i].split('=');
		if (cookieName === name) {
			return decodeURIComponent(cookieValue);
		}
	}
	return null;
}