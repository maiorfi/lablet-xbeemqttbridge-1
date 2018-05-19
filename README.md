# Bridge MQTT XBee (API) per NodeJS

Per abilitare la seriale /dev/ttyAMA0 sul RPi (UART0; TX=GPIO14,PIN 8 e RX=GPIO15, PIN 10) occorre editare il file /boot/config.txt (sudo nano /boot/config.txt) come segue:

+ Verificare che la riga "console=serial0,115200" non sia presente o, se invece lo fosse, commentarla con "#"
+ Aggiungere la seguente sezione (in fondo al file):
```
# Enable uart
enable_uart=1

# disables the Bluetooth device and restores UART0/ttyAMA0 to GPIOs 14 and 15
dtoverlay=pi3-disable-bt
```
+ disabilitare il servizio hciuart (utilizzato per pilotare il controller bluetooth) con "sudo systemctl disable hciuart"
+ Effettuare il reboot (sudo reboot)
