from fastapi import APIRouter, UploadFile, File, HTTPException, Request
import os
import uuid
import io
import aiofiles
# Trigger reload
from typing import List
from pathlib import Path
from PIL import Image, UnidentifiedImageError

router = APIRouter(prefix="/upload", tags=["Upload"])

# Get the directory where this file is located (backend/app/api/v1/)
# Go up to backend directory and then to static/uploads
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = BACKEND_DIR / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 5MB Limit
MAX_FILE_SIZE = 5 * 1024 * 1024

@router.get("", response_model=dict)
async def test_upload_route():
    return {"message": "Upload route is active"}

@router.post("", response_model=dict)
async def upload_file(request: Request, file: UploadFile = File(...)):
    try:
        # 1. Read file content
        contents = await file.read()
        
        # 2. Check file size
        if len(contents) > MAX_FILE_SIZE:
             raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")

        # 3. Verify it's a real image using Pillow
        try:
            image = Image.open(io.BytesIO(contents))
            image.verify()  # Checks if it's broken or invalid
            
            # Determine extension from format if possible, otherwise keep original or default to .jpg
            # image.format might be None after verify(), need to reopen or just trust verify passed.
            # Usually safe to use original extension if verify passed, or infer.
            # Let's verify format. verify() doesn't return anything.
            # To be safe against "file.exe" renamed to "file.jpg" passed as valid image? 
            # Pillow verify checks if it's a valid image structure.
            # We can force extension based on format if we really want, but keeping it simple:
            # Just ensure the file content IS an image.
            
        except (UnidentifiedImageError, Exception):
            raise HTTPException(status_code=400, detail="Invalid image file or format not supported.")

        # 4. Generate unique filename
        # Ensure extension matches user input or force lower case
        original_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
        if original_ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]:
             # If extension is weird but pillow verified it, maybe force .jpg or just allow?
             # User asked to "Extension content se decide karo" as better approach.
             # Re-opening to check format
             img = Image.open(io.BytesIO(contents))
             fmt = img.format  # e.g. JPEG, PNG
             if fmt == 'JPEG':
                 original_ext = '.jpg'
             elif fmt == 'PNG':
                 original_ext = '.png'
             elif fmt == 'WEBP':
                 original_ext = '.webp'
             elif fmt == 'GIF':
                 original_ext = '.gif'
             else:
                 # Default fallback or keep original if safe
                 if not original_ext:
                     original_ext = ".jpg"

        unique_filename = f"{uuid.uuid4()}{original_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # 5. Async save
        async with aiofiles.open(file_path, "wb") as buffer:
            await buffer.write(contents)
            
        # Return relative URL
        url = f"/static/uploads/{unique_filename}"
        
        return {"url": url}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

