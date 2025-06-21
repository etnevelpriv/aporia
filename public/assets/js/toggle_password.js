document.addEventListener('DOMContentLoaded', function() {
  const eyeButtons = document.querySelectorAll('.eye-button');
  eyeButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const input = this.parentElement.querySelector('input[type="password"], input[type="text"]');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          this.querySelector('i').classList.remove('fa-eye');
          this.querySelector('i').classList.add('fa-eye-slash');
        } else {
          input.type = 'password';
          this.querySelector('i').classList.remove('fa-eye-slash');
          this.querySelector('i').classList.add('fa-eye');
        }
      }
    });
  });
});
