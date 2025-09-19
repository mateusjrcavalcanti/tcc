import subprocess
from shutil import which


class WifiManager:
    """Gerencia operações de WiFi. Implementa métodos simples usados pelo GATT service."""

    def __init__(self):
        # detecta se nmcli está disponível
        self._has_nmcli = which("nmcli") is not None

    def _run(self, args):
        try:
            p = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
            if p.returncode == 0:
                return p.stdout.strip()
            return f"Error: {p.stderr.strip() or p.stdout.strip()}"
        except Exception as e:
            return f"Error: {str(e)}"

    def scan(self):
        if not self._has_nmcli:
            return "Error: nmcli not available"
        out = self._run(["nmcli", "-f", "SSID,SECURITY", "dev", "wifi", "list"])
        lines = out.splitlines()
        ssids = []
        for line in lines[1:]:
            parts = line.strip().split()
            if not parts:
                continue
            ssid = " ".join(parts[:-1]) if len(parts) > 1 else parts[0]
            ssids.append(ssid)
        return "\n".join(ssids) if ssids else out

    def status(self):
        if not self._has_nmcli:
            return "Error: nmcli not available"
        out = self._run(["nmcli", "-t", "-f", "ACTIVE,SSID,DEVICE,STATE", "dev", "wifi"])  # tabular
        for line in out.splitlines():
            if line.startswith("yes:") or line.startswith("yes\:") or line.startswith("yes"):
                return line.replace(":", " | ")
        conn = self._run(["nmcli", "-t", "-f", "NAME,UUID,DEVICE,TYPE,STATE", "connection", "show", "--active"]).strip()
        return conn or out

    def set_network(self, text):
        if not self._has_nmcli:
            return "Error: nmcli not available"
        parts = text.split("|", 1)
        ssid = parts[0].strip()
        password = parts[1].strip() if len(parts) > 1 else None
        if not ssid:
            return "Error: empty SSID"
        if password:
            return self._run(["nmcli", "dev", "wifi", "connect", ssid, "password", password])
        else:
            return self._run(["nmcli", "dev", "wifi", "connect", ssid])

    def disconnect(self, text=None):
        if not self._has_nmcli:
            return "Error: nmcli not available"
        if text:
            ssid = text.strip()
            conns = self._run(["nmcli", "-t", "-f", "NAME,DEVICE", "connection", "show", "--active"]) or ""
            for line in conns.splitlines():
                if line.startswith(ssid + ":") or line.split(":")[0] == ssid:
                    name = line.split(":")[0]
                    return self._run(["nmcli", "connection", "down", name])
            return "Error: active connection not found"
        return self._run(["nmcli", "networking", "off"]) or "Disconnected"
