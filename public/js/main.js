const maxContent = 8000;

document.addEventListener("DOMContentLoaded", () => {
	const userElem = document.querySelector(".user");
	const userInput = document.getElementById("input");
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
		document.querySelector(".submit").disabled = true;
		charSpan.style.color = "var(--error)";
	} else if (charCount <= maxContent && charCount > 0) {
		if (document.querySelector(".submit").disabled) {
			document.querySelector(".submit").removeAttribute("disabled");
			charSpan.removeAttribute("style");
		}
	} else if (charCount === 0) {
		document.querySelector(".submit").disabled = true;
	}
}

async function submitPaste(content) {
	const submitBtn = document.querySelector(".submit");
	if (content.length <= maxContent) {
		submitBtn.disabled = true;
		const req = await fetch("/submit", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content: content }),
		});
		if (req.ok) {
			submitBtn.style.borderColor = "var(--success)";
			const identifier = (await req.json()).identifier;
			setTimeout(() => {
				submitBtn.removeAttribute("style");
				submitBtn.removeAttribute("disabled");
				intermissal(identifier);
			}, 1000);
		} else {
			submitBtn.style.borderColor = "var(--error)";
			alert("failed to submit");
			setTimeout(() => {
				submitBtn.removeAttribute("style");
				submitBtn.removeAttribute("disabled");
			}, 2000);
		}
	}
}

function intermissal(identifier) {
	document.getElementById("bin").style.alignContent = "center";
	document.getElementById("bin").innerHTML =
		"successfully submitted. you can find your paste at " +
		`<a href="/p/${identifier}">https://${window.location.host}/p/${identifier}`;
}
