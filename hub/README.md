# Projeto Pi Zero W

Servidor de gerenciamento via BLE e USB gadget para Raspberry Pi Zero 2 W.

## Resumo

Este repositório fornece um servidor que expõe uma API para gerenciar Wi‑Fi,
armazenamento, upload de firmware e execução de scripts via duas interfaces:

- BLE (GATT)
- USB gadget (CDC ACM / `/dev/ttyGS0`) — protocolo newline-delimited JSON.

Todas as operações internas são roteadas por `src/bluetooth.py` (dispatcher)
e implementadas em módulos separados (`src/storage.py`, `src/firmware.py`,
`src/scripts.py`, `src/wifi.py`). O entrypoint único da aplicação é
`src/main.py`.

## Requisitos

- Raspberry Pi Zero 2 W (ou similar)
- Python 3.10+ (compatível com typing usado)
- BlueZ (bluetoothctl) no host; uma biblioteca Python opcional pode ser necessária para publicar GATT
- Para USB gadget: kernel com configfs e gadget configurado para criar `/dev/ttyGS0`

## Configuração do ambiente (venv) e dependências

1. Criar e ativar venv:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Instalar dependências Python:

   ```bash
   pip install -r requirements.txt
   ```

  (O arquivo `requirements.txt` pode listar bibliotecas opcionais usadas para BLE, se necessário.)

## Execução

Rodar a aplicação (entrypoint único):

```bash
python3 -m src.main
```

O `main.py` fará:

- checar se existe dispositivo Bluetooth conectado (`bluetooth.any_device_connected()`)
- se não houver, colocará o adaptador em modo discoverable/pairable (`bluetooth.make_discoverable_pairable()`)
- iniciar o servidor BLE (GATT)
- tentar iniciar o servidor USB gadget (`/dev/ttyGS0`) se disponível

## Serviços expostos por BLE (UUIDs)

Os serviços e características (UUIDs) estão em `src/ble_server.py`.

WiFi service

- WIFI_SSID_UUID (write): 22345678-1234-5678-1234-56789abcde01
- WIFI_PASS_UUID (write): 22345678-1234-5678-1234-56789abcde02
- WIFI_STATUS_UUID (read/notify): 22345678-1234-5678-1234-56789abcde03
  
  Nota: a leitura desta característica agora retorna um JSON com informações adicionais quando disponíveis. Exemplo:

  ```json
  {"ok": true, "ssid": "MinhaRede", "iface": "wlan0", "ip": "192.168.1.42", "gateway": "192.168.1.1", "connected": true}
  ```

  Em caso de erro: `{"ok": false, "error": "mensagem"}`

Script service

- SCRIPT_UPLOAD_UUID (write/chunk): 32345678-1234-5678-1234-56789abcde01
- SCRIPT_STATUS_UUID (read/notify): 32345678-1234-5678-1234-56789abcde02
- SCRIPT_RUN_UUID (write): 32345678-1234-5678-1234-56789abcde03

Filesystem service

- FS_LIST_UUID (read): 42345678-1234-5678-1234-56789abcde01
- FS_READ_UUID (read/write): 42345678-1234-5678-1234-56789abcde02
- FS_WRITE_UUID (write): 42345678-1234-5678-1234-56789abcde03
- FS_DELETE_UUID (write): 42345678-1234-5678-1234-56789abcde04
- FS_MKDIR_UUID (write): 42345678-1234-5678-1234-56789abcde05

## Protocolo USB gadget (serial)

Quando o gadget `/dev/ttyGS0` estiver disponível, o servidor USB deve ser
iniciado por `main.py` e aceitará comandos no formato newline-delimited JSON:

- Requisição por linha: `{"cmd":"nome_do_comando", "payload": {...}}\n`
- Resposta por linha: JSON com resultado, por exemplo `{"ok":true,...}\n`

Esse protocolo é idêntico ao usado pela interface BLE (os handlers são os
mesmos), permitindo que aplicações no host controlem o Pi por USB.

## Comandos JSON suportados (via BLE ou USB)

Os comandos são roteados por `bluetooth.handle_command(cmd, payload)`.

- wifi.set
  - payload: {"ssid":"<ssid>", "psk":"<senha_or_null>"}
  - exemplo: {"cmd":"wifi.set","payload":{"ssid":"MinhaRede","psk":"1234"}}

- firmware.start / firmware.chunk / firmware.finish (upload em sessões)
  - start: {"filename":"nome.bin", "size":opt, "checksum":opt}
  - chunk: {"session_id":"<sid>", "chunk":"<base64>"}
  - finish: {"session_id":"<sid>"}

- storage.list
  - payload: {"path":"<rel_path>"}

- storage.mkdir
  - payload: {"path":"pasta/sub"}

- storage.write
  - payload: {"path":"pasta/arq.bin","data":"<base64>","overwrite":true}

- storage.read (via FS_READ characteristic)
  - payload (escrito): {"path":"pasta/arq"}
  - resposta: conteúdo raw do arquivo (armazenado em `last_fs_read` internamente)

- storage.delete
  - payload: {"path":"pasta/ou_arquivo"}

- script upload/run
  - iniciar: escrever JSON {"type":"start","filename":"x.py"} na característica
  - enviar chunks raw (bytes) para a sessão única ativa
  - finalizar: `script_finish` interno tenta compilar o script
  - run: escrever path relativo para executar; resposta contém stdout/stderr/rc

## Storage paths

- Root de storage: `storage/` dentro do projeto (criado automaticamente ao executar)
- Firmware: `storage/firmware/`
- Scripts: `storage/scripts/`

## Exemplos rápidos

- Enviar comando via USB (host):

  ```bash
  echo '{"cmd":"storage.list","payload":{"path":""}}' > /dev/ttyACM0
  cat /dev/ttyACM0
  ```

- Enviar via Python no host:

  ```python
  import serial, time
  s = serial.Serial('/dev/ttyACM0', 115200, timeout=2)
  s.write(b'{"cmd":"storage.list","payload":{"path":""}}\n')
  print(s.readline())
  s.close()
  ```

## Limitações e segurança

- Não há autenticação; qualquer host/dispositivo conectado pode executar comandos.
- Sessões de upload estão em memória; reiniciar o processo perde o estado.
- O repositório não cria o gadget USB (configfs/root) — fornecer script separado se desejar.
- Operações com arquivos binários via JSON usam base64; cuidado com limites de MTU/MTU BLE.

## Troubleshooting

- `bluetoothctl` não encontrado: instale BlueZ no sistema.
- Se uma biblioteca Python para BLE for necessária, instale-a via pip (por exemplo, o pacote específico da implementação de GATT que preferir).
- Se `/dev/ttyGS0` não existir, verifique se o gadget foi configurado no kernel (configfs).

## Próximos passos sugeridos

- Adicionar autenticação/autorização para comandos sensíveis.
- Implementar reabertura automática do device USB se o host desconectar.
- Adicionar tests unitários para handlers (storage, firmware, scripts).

## Build & Test (GitHub Actions)

Como disparar o workflow

- Manual (UI): vá em Actions -> "Build & Release Pi Zero 2W executable" -> Run workflow.
- Por tag (CI): crie e envie uma tag que siga `v*`, por exemplo:

```bash
git tag v1.0.0
git push origin v1.0.0
```

O que o workflow gera

- Um executável armhf (single-file) chamado `hub-pi-zero-2w` é criado em `dist/`, enviado como artifact do run e anexado a um Release quando o push for uma tag.

Como baixar o artefato

- Pela interface do GitHub Actions: abra a execução do workflow e clique em `Artifacts` -> baixe o zip.
- Usando GitHub CLI (se houver Release com a tag):

```bash
gh release download v1.0.0 -p "hub-pi-zero-2w*"
```

Testar no Raspberry Pi Zero 2 W

1. Copie o binário para o Pi:

```bash
scp hub-pi-zero-2w pi@<PI_IP>:/home/pi/
ssh pi@<PI_IP>
```

2. No Pi:

```bash
chmod +x /home/pi/hub-pi-zero-2w
# executar como root (acesso ao bus do sistema / BlueZ normalmente requer privilégios)
sudo /home/pi/hub-pi-zero-2w
```

3. Verifique a saída do processo no terminal. Para logs em segundo plano, use `journalctl` (se executado como systemd service) ou redirecione stdout/stderr para um arquivo.

Notas importantes

- O binário criado por PyInstaller inclui o interpretador e dependências Python empacotadas, mas algumas dependências nativas (como bibliotecas do sistema para PyGObject / gobject-introspection) ainda podem ser necessárias no sistema alvo.
- Se o executável falhar por falta de bibliotecas nativas, instale no Pi:

```bash
sudo apt update
sudo apt install -y libglib2.0-0 libgirepository1.0-1 python3-gi
```

- Se o seu fluxo precisa de arquivos extras (por exemplo a pasta `storage/`), recompile adicionando `--add-data` ao PyInstaller no Dockerfile / workflow.


## Contato

Para dúvidas sobre a implementação, abra uma issue no repositório ou peça
que eu gere exemplos de chamadas específicas.
