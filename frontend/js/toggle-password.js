document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.password-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const wrapper = this.closest('.input-wrapper');
            const input = wrapper ? wrapper.querySelector('input') : null;

            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';

                this.classList.toggle('is-visible');
            }
        });
    });
});