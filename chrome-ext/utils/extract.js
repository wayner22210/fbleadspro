export function extractLeadData(doc = document) {
  const lead = {
    name: findTextInput(doc, /name|full\s?name/i),
    email: findTextInput(doc, /email/i),
    phone: findTextInput(doc, /phone|mobile/i),
    timestamp: new Date().toISOString()
  };
  return lead;
}

function findTextInput(doc, regex) {
  const inputs = doc.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
  for (const input of inputs) {
    if (regex.test(input.name || input.placeholder || input.ariaLabel || '')) {
      return input.value || null;
    }
  }
  return null;
}
