// --- Homepage Logic (Redirect Buttons) ---
document.addEventListener("DOMContentLoaded", () => {

  // ✅ Buttons that should open SIGN UP form by default
  const signupRelated = document.querySelectorAll(".signup, #getStartedBtn, .btn-primary");
  signupRelated.forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = "login.php?tab=signup"; // ✅ add URL parameter
    });
  });

  // ✅ Buttons that should open SIGN IN form by default
  const loginBtn = document.querySelector(".login");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "login.php?tab=signin";
    });
  }

  // --- Dashboard & Logout Logic (unchanged) ---
  const links = document.querySelectorAll(".sidebar a[data-section]");
  const sections = document.querySelectorAll(".content-section");

  if (links && sections) {
    links.forEach(link => {
      link.addEventListener("click", e => {
        e.preventDefault();
        const target = link.getAttribute("data-section");
        sections.forEach(s => s.classList.remove("active"));
        document.getElementById(target)?.classList.add("active");
      });
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", e => {
      e.preventDefault();
      window.location.href = "homepage.html";
    });
  }
});