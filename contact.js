const contactForm = document.querySelector("#contactForm");
const contactStatus = document.querySelector("#contactStatus");

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const email = window.REELAGP_CONTACT_EMAIL || "contact@reelagp.onrender.com";
    const subject = encodeURIComponent(`[ReelAGP] ${formData.get("topic") || "Support request"}`);
    const message = [
      `Name: ${formData.get("name") || ""}`,
      `Email: ${formData.get("email") || ""}`,
      `Instagram URL: ${formData.get("instagramUrl") || ""}`,
      "",
      formData.get("message") || ""
    ].join("\n");

    window.location.href = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(message)}`;
    contactStatus.textContent = "Email app open ho raha hai. Message send karne ke liye apne email app me Send dabayein.";
  });
}
