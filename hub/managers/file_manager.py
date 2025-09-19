from pathlib import Path

class FileManager:
    def __init__(self, base_dir):
        self.base_dir = Path(base_dir)
        self.file_context = {'filename': ''}

    def list_files(self):
        try:
            files = [f.name for f in self.base_dir.iterdir() if f.is_file()]
            # return JSON array string for easier parsing on the client
            import json
            return json.dumps(files)
        except Exception as e:
            return f"Error: {str(e)}"

    def create_file(self, text):
        try:
            path = self.base_dir / text.strip()
            if not path.exists():
                path.touch()
                return "File created"
            return "File already exists"
        except Exception as e:
            return f"Error: {str(e)}"

    def delete_file(self, text):
        try:
            path = self.base_dir / text.strip()
            if path.exists():
                path.unlink()
                return "File deleted"
            return "File not found"
        except Exception as e:
            return f"Error: {str(e)}"

    def read_file_set_filename(self, text):
        self.file_context['filename'] = text.strip()

    def read_file_func(self):
        try:
            path = self.base_dir / self.file_context.get('filename', '')
            if path.exists():
                return path.read_text()
            return "File not found"
        except Exception as e:
            return f"Error: {str(e)}"

    def write_file_func(self, text):
        try:
            path = self.base_dir / self.file_context.get('filename', '')
            if path.exists():
                path.write_text(text)
                return "File written"
            return "File not found"
        except Exception as e:
            return f"Error: {str(e)}"
