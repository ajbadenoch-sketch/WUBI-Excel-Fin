// VidaControl - Client-side JavaScript

// Close modals when clicking overlay
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Close modal on Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(function(m) {
            m.classList.remove('active');
        });
    }
});

// Range input value display
document.querySelectorAll('input[type="range"]').forEach(function(range) {
    var label = range.closest('.form-group').querySelector('label');
    if (label) {
        var baseText = label.textContent.replace(/\(\d+\)/, '').trim();
        range.addEventListener('input', function() {
            label.textContent = baseText + ' (' + this.value + ')';
        });
    }
});

// Set today's date on empty date inputs
document.querySelectorAll('input[type="date"]').forEach(function(input) {
    if (!input.value) {
        input.value = new Date().toISOString().split('T')[0];
    }
});

// Confirm delete actions
document.querySelectorAll('form[action*="/delete"]').forEach(function(form) {
    form.addEventListener('submit', function(e) {
        if (!confirm('Estas seguro de que quieres eliminar esto?')) {
            e.preventDefault();
        }
    });
});
