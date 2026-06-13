interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
}

interface USBOutTransferResult {
  status: "ok" | "stall" | "babble";
  bytesWritten: number;
}

interface USBDevice {
  manufacturerName?: string;
  productName?: string;
  serialNumber?: string;
  configuration: USBConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBConfiguration {
  interfaces: USBInterface[];
}

interface USBInterface {
  interfaceNumber: number;
  alternates: USBAlternateInterface[];
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[];
}

interface USBEndpoint {
  direction: "in" | "out";
  endpointNumber: number;
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: { filters: USBDeviceFilter[] }): Promise<USBDevice>;
}

interface Navigator {
  usb?: USB;
}
