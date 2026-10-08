// The gate's SHOW / HIDE toggle for the access key (/vault/ and /live/)
export function keyField(input, toggle) {
  toggle.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.textContent = show ? "HIDE" : "SHOW";
    toggle.setAttribute("aria-pressed", String(show));
    input.focus();
  });
}
