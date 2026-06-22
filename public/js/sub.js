import {
	Key,
	Cypher,
	bufferToB64,
	bytesToB64,
	createUintArray,
	b64ToBytes,
	createBuffer,
} from "./main.js";

const maxContent = 8000;
let usepw = false;
let delView = false;

// things encrypted and encoded to base64. key encoded in url.

// main stuff

document.addEventListener("DOMContentLoaded", () => {
	const userElem = document.querySelector(".user");
	const userInput = document.getElementById("input");
	document.getElementById("input").style.height = userInput.scrollHeight + "px";
	userInput.addEventListener("focusin", () => {
		userElem.style.borderColor = "#ffffff";
	});
	userInput.addEventListener("focusout", () => {
		userElem.removeAttribute("style");
	});
	userInput.addEventListener("input", (event) => {
		updateText(event);
	});
});

// making text counter match input length

function updateText(event) {
	const userInput = document.getElementById("input");
	const curScroll = window.scrollY;
	userInput.style.height = "auto";
	userInput.style.height = userInput.scrollHeight + "px";
	window.scroll(null, curScroll);
	const charSpan = document.getElementById("currentChars");
	const charElem = document.querySelector(".charcount");
	const charCount = userInput.value.length;

	charSpan.innerText = charCount;
	if (charCount > maxContent) {
		document.getElementById("usr-submit").disabled = true;
		charSpan.style.color = "var(--error)";
	} else if (charCount <= maxContent && charCount > 0) {
		if (document.getElementById("usr-submit").disabled) {
			document.getElementById("usr-submit").removeAttribute("disabled");
			charSpan.removeAttribute("style");
		}
	} else if (charCount === 0) {
		document.getElementById("usr-submit").disabled = true;
	}
}

// submission, message is encrypted before being submitted. decryption key and nonce is then appended to the message URL given after a hash

async function submitPaste(content) {
	const submitBtn = document.getElementById("usr-submit");
	if (content.length <= maxContent) {
		submitBtn.disabled = true;

		if (usepw) {
			const pw = await queryPassword();
			if (pw && pw != 0) {
				try {
					const encryption = await encryptData(content, pw);
					console.log(encryption, "this");

					await submit(encryption);

					document.getElementById("popup-container").style.display = "none";
				} catch (e) {
					console.error(e);
					showSubmitError();
				}
			}
		} else {
			try {
				const encryption = await encryptData(content);

				await submit(encryption);
			} catch (e) {
				console.error(e);
				showSubmitError();
			}
		}
		// console.log(content);

		async function submit(json) {
			const skinnedJson = JSON.parse(JSON.stringify(json));
			delete skinnedJson.key.data;
			if (delView) {
				skinnedJson.uses = 1;
			}
			const req = await fetch("/submit", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(skinnedJson),
			});
			document.getElementById("usr-submit").innerText = "submitting";

			if (req.ok) {
				submitBtn.style.borderColor = "var(--success)";
				const identifier = (await req.json()).identifier;
				intermissal(identifier, json.key.data);
			} else {
			}
		}
	}
}

function showSubmitError(e) {
	const submitBtn = document.getElementById("usr-submit");

	submitBtn.style.borderColor = "var(--error)";
	submitBtn.innerText = "failed";
	setTimeout(() => {
		submitBtn.removeAttribute("style");
		submitBtn.removeAttribute("disabled");
		submitBtn.innerText = "submit";
	}, 2000);
}

document.getElementById("usr-submit").addEventListener("click", () => {
	submitPaste(document.getElementById("input").value);
});
document.getElementById("pwbtn").addEventListener("click", () => {
	togglePw();
});

// replacing input information with link to submission location

function intermissal(identifier, privkey) {
	document.getElementById("bin").style.alignContent = "center";
	const url = `p/${identifier}#${privkey}`;
	document.getElementById("bin").innerHTML =
		"successfully submitted. you can find your paste at " +
		`<a href="/${url}">${window.location.host}/${url}`;
	const btn = Object.assign(document.createElement("button"), {
		innerText: "copy",
	});
	btn.setAttribute(
		"onClick",
		`navigator.clipboard.writeText("${location}${url}"); alert("copied text ${location}${url} to clipboard")`,
	);
	document.getElementById("bin").appendChild(btn);
}

// encryption

async function encryptData(data, password = false) {
	try {
		const key = new Key();
		key.generate();
		const cypher = new Cypher(await key.key);
		await key.exportKey(await key.key);
		let exported = await bufferToB64(await key.exported);
		const keyIv = await bufferToB64(key.iv);

		//data = bufferToB64(await cypher.encrypt(await createUintArray(data)));
		data = await cypher.encrypt(await createUintArray(data));
		// const dataIv = data.
		const dataIv = btoa(data.iv);

		data = await bufferToB64(data.data);
		const json = {
			content: {
				data: data,
				iv: dataIv,
			},
			key: {
				iv: keyIv,
			},
		};
		if (!password) {
			json.key.data = exported;
			return json;
		} else {
			try {
				const passwordKey = new Key();
				await passwordKey.generatePassword(password);
				const salt = bytesToB64(passwordKey.salt);

				const keyData = passwordKey.key;
				const PswKeyB64 = bufferToB64(
					await passwordKey.wrap(await keyData, await key.key),
				);
				// console.log(await aaa, "a", exported);
				json.key.data = PswKeyB64;
				json.psw = {};
				json.psw.salt = salt;
				json.psw.iv = bufferToB64(passwordKey.iv);
				// console.log(keyData, "keydata and json: ", json);
				return json;
			} catch (e) {
				throw new Error("failed to encrypt primary key ", e);
			}
		}
	} catch (e) {
		throw new Error("encryption failed ", e);
	}
}

// authentication

function togglePw() {
	usepw = !usepw;

	document
		.getElementById("pwbtn")
		.setAttribute("style", usepw ? "--c:var(--success" : "");
}

function toggleViewDeletion() {
	const elem = document.getElementById("delv");
	delView = !delView;
	if (delView) {
		elem.setAttribute("style", "--c:var(--success)");
	} else {
		elem.removeAttribute("style");
	}
}

document.getElementById("delv").addEventListener("click", toggleViewDeletion);

function queryPassword() {
	const btn = document.getElementById("password");
	const h = document.getElementById("popup");
	const container = document.getElementById("popup-container");
	const pw = document.getElementById("password");
	const confirmpw = document.getElementById("confirm-password");
	const submit = document.getElementById("pw-submit");
	container.style.display = "block";

	[pw, confirmpw].forEach((e) => {
		pwListener(e);
		pwBorder(e);
	});
	function confirmMatch() {
		return confirmpw.value === pw.value;
	}

	function pwBorder(elem) {
		elem.addEventListener("focusin", change);
		elem.addEventListener("focusout", change);
		function change() {
			if (pw.value !== "") {
				pw.style.borderColor =
					"color-mix(in hsl, var(--primary-container) 75%, white 35%)";
			} else {
				pw.removeAttribute("style");
			}
		}
	}
	function pwListener(elem) {
		const border = elem.style.borderColor;
		elem.addEventListener("input", (event) => {
			if (confirmpw.value != "") {
				if (!confirmMatch()) {
					confirmpw.style.borderColor = "var(--error)";
				} else {
					confirmpw.style.borderColor = "var(--success)";
					// pw.style.borderColor = "var(--success)";
				}
			} else if (confirmpw.value == "") {
				confirmpw.removeAttribute("style");
			}
		});
	}
	return new Promise((resolve, reject) => {
		submit.addEventListener(
			"click",
			() => {
				const invalid = () => {
					submit.innerText = "invalid";
					submit.disabled = true;
					setTimeout(() => {
						submit.innerText = "submit";
						submit.disabled = false;
					}, 2000);
				};
				if (confirmMatch()) {
					document.getElementById("usr-submit").innerText = "encrypting...";
					container.style.display = "none";
					resolve(pw.value);
				} else {
					invalid();
				}
			},
			{ once: true },
		);
		document.getElementById("pw-cancel").addEventListener("click", () => {
			reject(new Error("cancelled"));
		});
	});
}
