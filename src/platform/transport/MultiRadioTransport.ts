import TcpSocket from 'react-native-tcp-socket';
import dgram from 'react-native-udp';
import {BleManager} from 'react-native-ble-plx';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import {
  initialize as initWifiP2p,
  startDiscoveringPeers,
  connect as connectWifiP2p,
} from 'react-native-wifi-p2p';
import {Packet} from '../../core/transport/Packet';
import {FrameReader, PacketCodec} from '../../core/transport/PacketCodec';
import {SessionCrypto} from '../../core/crypto/SessionCrypto';

export enum TransportMedium {
  WIFI_DIRECT = 'WIFI_DIRECT',
  BLUETOOTH_CLASSIC = 'BLUETOOTH_CLASSIC',
  BLE_MESH = 'BLE_MESH',
  LAN_SOCKET = 'LAN_SOCKET',
}

/**
 * Unified Multi-Radio Transport Abstraction behind a single interface:
 * Wi-Fi Direct (`react-native-wifi-p2p`), Bluetooth Classic (`react-native-bluetooth-classic`),
 * BLE Mesh (`react-native-ble-plx`), and LAN TCP/UDP (`react-native-tcp-socket` / `react-native-udp`).
 */
export class MultiRadioTransport {
  private readonly bleManager = new BleManager();
  private readonly frameReader = new FrameReader();
  private tcpClient: any = null;
  private udpSocket: any = null;

  constructor(
    private crypto: SessionCrypto,
    private readonly onPacketReceived: (packet: Packet) => void,
  ) {}

  async initWifiDirect(): Promise<void> {
    await initWifiP2p();
    await startDiscoveringPeers();
  }

  async connectWifiPeer(deviceAddress: string): Promise<void> {
    await connectWifiP2p(deviceAddress);
  }

  connectLanTcp(host: string, port: number = 8988): void {
    this.tcpClient = TcpSocket.createConnection({host, port}, () => {});
    this.tcpClient.on('data', (data: Uint8Array) => {
      const frames = this.frameReader.offer(data);
      for (const body of frames) {
        const pkt = PacketCodec.decodeBody(body, this.crypto);
        this.onPacketReceived(pkt);
      }
    });
  }

  startLanUdpAlertBroadcastListener(port: number = 49152): void {
    this.udpSocket = dgram.createSocket({type: 'udp4'});
    this.udpSocket.bind(port);
    this.udpSocket.on('message', (msg: Uint8Array) => {
      try {
        const frames = this.frameReader.offer(msg);
        for (const body of frames) {
          const pkt = PacketCodec.decodeBody(body, this.crypto);
          this.onPacketReceived(pkt);
        }
      } catch {
        // Ignore malformed/unauthenticated frames (fail closed)
      }
    });
  }

  sendPacket(packet: Packet): boolean {
    const encoded = PacketCodec.encode(packet, this.crypto);
    if (this.tcpClient) {
      this.tcpClient.write(encoded);
      return true;
    }
    return false;
  }

  async listBondedBluetoothDevices() {
    return RNBluetoothClassic.getBondedDevices();
  }

  disconnect(): void {
    this.tcpClient?.destroy();
    this.tcpClient = null;
    this.udpSocket?.close();
    this.udpSocket = null;
    this.frameReader.reset();
  }
}
