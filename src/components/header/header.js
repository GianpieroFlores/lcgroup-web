import "./header.css";
export async function loadHeader() {

    const response = await fetch("/src/components/header/header.html");

    const html = await response.text();

    document.getElementById("header-container").innerHTML = html;

}