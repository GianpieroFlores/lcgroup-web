import "./footer.css";
export async function loadFooter() {

    const response = await fetch("/src/components/footer/footer.html");

    const html = await response.text();

    document.getElementById("footer-container").innerHTML = html;

}