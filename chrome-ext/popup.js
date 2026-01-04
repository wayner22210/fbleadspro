document.addEventListener('DOMContentLoaded', () => {
  const display = document.getElementById('leadDisplay');
  const lead = JSON.parse(localStorage.getItem('latestLead'));
  if (!lead) {
    display.innerText = 'No lead captured yet.';
    return;
  }
  display.innerHTML = `
    <p><strong>Name:</strong> ${lead.name}</p>
    <p><strong>Email:</strong> ${lead.email}</p>
    <p><strong>Phone:</strong> ${lead.phone}</p>
    <p><em>${new Date(lead.timestamp).toLocaleString()}</em></p>
  `;
});
