import os
import time
from playwright.sync_api import sync_playwright, expect

def verify_agent_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a consistent context/storage
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to Signup...")
        page.goto("http://localhost:5173/signup")

        # Fill form
        print("Filling Signup Form...")
        page.fill('#name', "Test User")
        page.fill('#email', f"test_{int(time.time())}@example.com") # Unique email
        page.fill('#hotelName', "Test Hotel")
        page.fill('#password', "Password123")
        page.fill('#confirmPassword', "Password123")

        # Click Signup
        print("Submitting...")
        page.click('button[type="submit"]')

        # Wait for Dashboard
        print("Waiting for Dashboard...")
        page.wait_for_url("**/dashboard", timeout=20000)

        # Now navigate to Agent
        print("Navigating to Agent Page...")
        page.goto("http://localhost:5173/agent")

        # Check for title
        print("Verifying Title...")
        expect(page.get_by_text("Hotelier AI Assistant")).to_be_visible()

        # Type a message
        print("Sending Message...")
        page.fill('input[placeholder*="Type your request"]', "Hello AI")
        page.click('button:has(svg.lucide-send)')

        # Wait a bit for UI to update (message bubble appears)
        page.wait_for_timeout(2000)

        # Take screenshot
        print("Taking Screenshot...")
        os.makedirs("/home/jules/verification", exist_ok=True)
        screenshot_path = "/home/jules/verification/agent_page.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_agent_page()
