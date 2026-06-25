const toast = {
  show(message, type = "info") {
    const container = document.getElementById("toast-container");
    const element = document.createElement("div");

    element.className = `toast toast-${type}`;
    element.textContent = message;
    container.appendChild(element);

    setTimeout(() => {
      element.classList.add("toast-visible");
    }, 10);

    setTimeout(() => {
      element.classList.remove("toast-visible");
      setTimeout(() => {
        element.remove();
      }, 300);
    }, 3000);
  }
};

window.toast = toast;
