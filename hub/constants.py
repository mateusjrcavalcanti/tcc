import os
from pathlib import Path

# Diretório compartilhado
SHARED_DIR = os.path.expanduser("~/shared")
Path(SHARED_DIR).mkdir(exist_ok=True)
BASE_DIR = Path(SHARED_DIR)

# Adaptador Bluetooth
ADAPTER_PATH = "/org/bluez/hci0"
DEVICE_NAME = "Raspberry Pi Zero 2W"

APP_PATH = "/org/example"