import os
import time
from playwright.sync_api import sync_playwright, expect

def verify_rate_shopper():
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
        page.fill('#email', f"test_rates_{int(time.time())}@example.com") # Unique email
        page.fill('#hotelName', "Test Hotel")
        page.fill('#password', "Password123")
        page.fill('#confirmPassword', "Password123")

        # Click Signup
        print("Submitting...")
        page.click('button[type="submit"]')

        # Wait for Dashboard
        print("Waiting for Dashboard...")
        page.wait_for_url("**/dashboard", timeout=20000)

        # Now navigate to Rate Shopper
        print("Navigating to Rate Shopper...")
        page.goto("http://localhost:5173/rate-shopper")

        # Check for title and AI elements
        print("Verifying UI Elements...")
        expect(page.get_by_text("Competitor Rate Shopper")).to_be_visible()
        expect(page.get_by_text("AI Market Insight")).to_be_visible() # Check for new AI card if data exists
        # Since we have no data, it might not show or show "No data"
        # Let's check for the add button
        expect(page.get_by_text("Add Competitor")).to_be_visible()

        # Take screenshot
        print("Taking Screenshot...")
        os.makedirs("/home/jules/verification", exist_ok=True)
        screenshot_path = "/home/jules/verification/rate_shopper.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_rate_shopper()
