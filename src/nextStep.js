// Display only. The existing projection has no procedural guidance or write receipt.
// Do not infer instructions from a message, persona, URL or successful chat launch.
export function nextStepEnabled(search = '', releaseEnabled = true) {
  return releaseEnabled && new URLSearchParams(search).get('nextStep') !== '0';
}
export function nextStepModel(card, {bound = false, ended = false} = {}) {
  if (!bound || ended || !card) return {
    available: false,
    explanation: ended ? 'This conversation has ended.' : 'Start a conversation with Alex to connect your support record.',
    action: ended ? 'Start a new conversation when you are ready.' : 'Your next step will appear after your support record connects.',
    reports: []
  };
  return {
    available: true,
    explanation: card.conclusion,
    action: card.nextAction,
    reports: card.customerReports || [],
    guidance: 'Applicable instructions are not available in this page’s connected checks. Ask Alex to look for guidance for your product, app and region.',
    // A visible/reportable reading is not equivalent to a verified recovery.
    askAboutReadings: card.nextAction === 'Can you see readings in your app?'
  };
}
