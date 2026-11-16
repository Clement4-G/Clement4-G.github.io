// L'adresse e-mail n'est jamais écrite dans la page : elle est assemblée au clic.

export function revealEmail(button, email) {
  button.addEventListener(
    'click',
    () => {
      const address = `${email.user}@${email.domain}`;
      const link = document.createElement('a');
      link.className = button.className;
      link.href = `mailto:${address}`;
      link.textContent = address;
      button.replaceWith(link);
      link.focus();
    },
    { once: true },
  );
}
