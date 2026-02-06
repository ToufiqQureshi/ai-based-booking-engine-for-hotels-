from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends
import os
import uuid
import io
import aiofiles
import logging
from typing import List
from pathlib import Path
from PIL import Image, UnidentifiedImageError
from app.api.deps import get_current_active_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["Upload"])

# Get the directory where this file is located (backend/app/api/v1/)
# Go up to backend directory and then to static/uploads
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = BACKEND_DIR / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# SECURITY: File upload constraints
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"
}


@router.get("", response_model=dict)
async def test_upload_route():
    return {"message": "Upload route is active"}


@router.post("", response_model=dict)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user = Depends(get_current_active_user)
):
    try:
        # SECURITY: Validate filename exists and is not empty
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # SECURITY: Check for path traversal attempts
        if ".." in file.filename or "/" in file.filename or "\\" in file.filename:
            logger.warning(f"Path traversal attempt detected: {file.filename} by user {current_user.id}")
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        # SECURITY: Validate extension before reading file (fail fast)
        original_ext = os.path.splitext(file.filename)[1].lower()
        if original_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # SECURITY: Validate content type header
        if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Content type not allowed")
        
        # 1. Read file content
        contents = await file.read()
        
        # 2. Check file size
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")
        
        # 3. For images, verify it's a real image using Pillow
        if original_ext in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            try:
                image = Image.open(io.BytesIO(contents))
                image.verify()  # Checks if it's broken or invalid
                
                # Re-open to get format (verify() consumes the stream)
                img = Image.open(io.BytesIO(contents))
                fmt = img.format  # e.g. JPEG, PNG
                
                # SECURITY: Force extension based on actual content
                if fmt == 'JPEG':
                    original_ext = '.jpg'
                elif fmt == 'PNG':
                    original_ext = '.png'
                elif fmt == 'WEBP':
                    original_ext = '.webp'
                elif fmt == 'GIF':
                    original_ext = '.gif'
                    
            except (UnidentifiedImageError, Exception) as e:
                logger.warning(f"Invalid image upload attempt: {file.filename} - {e}")
                raise HTTPException(status_code=400, detail="Invalid image file or format not supported.")
        
        # 4. For PDFs, basic magic byte validation
        if original_ext == ".pdf":
            if not contents.startswith(b'%PDF'):
                raise HTTPException(status_code=400, detail="Invalid PDF file")

        # 5. Generate secure UUID-based filename (prevents guessing)
        unique_filename = f"{uuid.uuid4()}{original_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # SECURITY: Final path validation (paranoid check)
        if not file_path.resolve().is_relative_to(UPLOAD_DIR.resolve()):
            logger.critical(f"Path escape attempt: {file_path}")
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # 6. Async save
        async with aiofiles.open(file_path, "wb") as buffer:
            await buffer.write(contents)
        
        logger.info(f"File uploaded: {unique_filename} by user {current_user.id}")
        
        # Return relative URL
        url = f"/static/uploads/{unique_filename}"
        return {"url": url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="File upload failed")


