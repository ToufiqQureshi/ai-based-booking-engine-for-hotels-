
import requests
import os

BASE_URL = "http://127.0.0.1:8003/api/v1"

def test_upload_image():
    print("Testing Image Upload API...")
    
    # create a dummy image file
    dummy_filename = "test_image.jpg"
    with open(dummy_filename, "wb") as f:
        f.write(os.urandom(1024)) # 1KB of random data
        
    url = f"{BASE_URL}/upload"
    files = {"file": (dummy_filename, open(dummy_filename, "rb"), "image/jpeg")}
    
    try:
        response = requests.post(url, files=files)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Upload Successful!")
            print(f"   URL: {data['url']}")
            
            # Verify the URL is accessible
            img_url = data['url']
            # Re-request the image to see if it serves
            img_res = requests.get(img_url)
            if img_res.status_code == 200:
                print(f"✅ Image is servable at {img_url}")
            else:
                print(f"❌ Image not found at {img_url} (Status: {img_res.status_code})")
                
        else:
             print(f"❌ Upload Failed: {response.text}")
             
    except Exception as e:
        print(f"❌ Request Failed: {e}")
    finally:
        # Cleanup
        if os.path.exists(dummy_filename):
            os.remove(dummy_filename)

if __name__ == "__main__":
    test_upload_image()
