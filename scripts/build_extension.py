import os
import shutil
import re
import zipfile

SOURCE_DIR = 'chrome_extension'
DIST_DIR = 'dist/chrome_extension'
ZIP_NAME = 'dist/hotelier_hub_extension.zip'

FILES_TO_COPY = [
    'manifest.json',
    'background.js',
    'content.js',
    'scraper.js',
    'popup.html',
    'popup.js'
]

# Robust Shim to disable console in production
CONSOLE_SHIM = """
// [PRODUCTION BUILD] Console Output Disabled
(function() {
    try {
        var noop = function() {};
        var methods = ['log', 'warn', 'error', 'info', 'debug'];
        for (var i = 0; i < methods.length; i++) {
            console[methods[i]] = noop;
        }
    } catch (e) {}
})();
"""

def clean_js(content):
    # Remove block comments (safer than line comments)
    content = re.sub(r'/\*[\s\S]*?\*/', '', content)

    # Remove empty lines
    content = os.linesep.join([s for s in content.splitlines() if s.strip()])

    # Prepend the shim
    return CONSOLE_SHIM + "\n" + content

def build():
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR)

    print(f"Building extension from {SOURCE_DIR} to {DIST_DIR}...")

    for filename in FILES_TO_COPY:
        src_path = os.path.join(SOURCE_DIR, filename)
        if not os.path.exists(src_path):
            print(f"Skipping {filename} (not found)")
            continue

        dst_path = os.path.join(DIST_DIR, filename)

        if filename.endswith('.js'):
            print(f"Processing {filename}...")
            with open(src_path, 'r', encoding='utf-8') as f:
                content = f.read()

            content = clean_js(content)

            with open(dst_path, 'w', encoding='utf-8') as f:
                f.write(content)
        else:
            print(f"Copying {filename}...")
            shutil.copy(src_path, dst_path)

    # Zip the directory
    zip_path = ZIP_NAME
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(DIST_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, DIST_DIR)
                zipf.write(file_path, arcname)

    print(f"Build success! Extension packaged at: {os.path.abspath(zip_path)}")

if __name__ == "__main__":
    build()
