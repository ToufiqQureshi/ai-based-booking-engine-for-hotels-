
const API_URL = "http://127.0.0.1:8001/api/v1/reviews";

document.getElementById('analyze-btn').addEventListener('click', async () => {
    const btn = document.getElementById('analyze-btn');
    const resultDiv = document.getElementById('result');
    const draftArea = document.getElementById('draft-area');
    const draftText = document.getElementById('draft-text');

    btn.innerText = "Scanning & Syncing...";
    btn.disabled = true;
    resultDiv.innerText = "";
    draftArea.style.display = "none";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 1. Scrape Reviews
    chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_REVIEWS" }, async (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
            resultDiv.innerText = "Error: Could not scan page. Refresh and try again.";
            btn.innerText = "📥 Sync & Draft Reply";
            btn.disabled = false;
            return;
        }

        const reviews = response.reviews;
        resultDiv.innerText = `Found ${reviews.length} reviews. Syncing with Hotelier Hub...`;

        try {
            // 2. Ingest to Backend
            // Note: In a real app, user needs to be authenticated. 
            // We assume local dev or a fixed token if available, or just open API for local agent.
            // For now, let's assume open API or try to get token from storage if implemented.

            const ingestRes = await fetch(`${API_URL}/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reviews)
            });
            const savedReviews = await ingestRes.json();

            resultDiv.innerText = `Synced ${savedReviews.length} reviews. Generating Draft for latest...`;

            // 3. Find a review to reply to (e.g., the first one that is PENDING)
            // Ideally we ask user which one, but for automation we pick the latest unreplied.
            let targetReview = savedReviews.find(r => r.status === 'PENDING' || r.status === 'DRAFTED');

            if (!targetReview && savedReviews.length > 0) {
                // If all replied, just pick the first one to demo re-drafting
                targetReview = savedReviews[0];
            }

            if (targetReview) {
                // 4. Generate Reply
                const replyRes = await fetch(`${API_URL}/${targetReview.id}/generate-reply`, {
                    method: 'POST'
                });
                const updatedReview = await replyRes.json();

                // 5. Show Draft
                draftArea.style.display = "block";
                draftText.value = updatedReview.ai_reply_draft;
                resultDiv.innerText = `Draft ready for: ${updatedReview.guest_name}`;

                // Enable Paste Button
                document.getElementById('paste-btn').onclick = () => {
                    const textToPaste = draftText.value;
                    chrome.tabs.sendMessage(tab.id, { action: "PASTE_REPLY", text: textToPaste }, (pasteRes) => {
                        if (pasteRes && pasteRes.success) {
                            resultDiv.innerText = "✅ Pasted! Please verify and Submit.";
                            // Optional: Update status to REPLIED in backend
                            // fetch(`${API_URL}/${targetReview.id}`, { method: 'PUT', body: JSON.stringify({status: 'REPLIED'}) });
                        } else {
                            resultDiv.innerText = "❌ Paste Failed. Click inside the box first.";
                        }
                    });
                };

            } else {
                resultDiv.innerText = "Sync complete. No reviews need reply.";
            }

        } catch (err) {
            resultDiv.innerText = "Backend Error: " + err.message;
        } finally {
            btn.innerText = "📥 Sync & Draft Reply";
            btn.disabled = false;
        }
    });
});
