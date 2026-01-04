// Injected into Facebook lead form pages

import { extractLeadData } from './utils/extract.js';

(function scrapeLeadForm() {
  const observer = new MutationObserver(() => {
    const lead = extractLeadData(document);
    if (lead && lead.email && lead.name) {
      console.log('🧠 Lead detected:', lead);
      localStorage.setItem('latestLead', JSON.stringify(lead));
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
