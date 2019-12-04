import * as microtime from "microtime";
import { Device as HidDevice, devices as hidDevices, HID } from "node-hid";
import { Subject } from "rxjs";
import { SteamDevice } from "./steam-device";
import { SteamHidDevice } from "./steam-device/steam-hid-device";

import {
    DualshockBattery,
    DualshockConnection,
    DualshockMeta,
    DualshockModel,
    DualshockReport,
    DualshockState,
    GenericControllerDevice,
    GenericSteamDevice,
    SteamDeviceRatios,
    SteamDeviceReport,
    SteamDeviceScales,
    SteamDeviceState,
    SteamHidId,
    MotionData, 
    MotionDataWithTimestamp
} from "./models";
import { HidFeatureArray } from "./steam-device/hid-feature-array";

// tslint:disable-next-line:no-var-requires
const usbDetect = require("usb-detection");

/**
 * Possible HID device types.
 */
type DeviceType = "steam-dongle" | "steam-wired" | "ds4-bluetooth" | "ds4-wired";


/**
 * Event handler for list change events.
 */
const listChangeSubject = new Subject<void>();

/**
 * Interface for storing HID devices.
 */
interface Item {
    info: HidDevice;
    type: DeviceType;
    active: boolean;
    device: GenericControllerDevice<MotionDataWithTimestamp> | null;
}



class ControllerMaster {    

    public controllerList: GenericController[];
    private deviceList: GenericControllerDevice<MotionDataWithTimestamp>[];
    private itemList = new Map<string, Item>();
    private hidDeviceList: HidDevice[] | null = null;

    constructor() {
        this.deviceList = [];
    }


    /**
     * Enumerate currently available devices.
     */
    public enumerateDevices() {
        const devices: string[] = [];

        for (const [path, item] of this.itemList) {
            if (item.device === null) {
                if ((activeOnly && item.active) || !activeOnly) {
                    devices.push(path);
                    
                }
            }
        }

        return devices;
    }

    /**
     * Shorthand function for filtering and sorting device array.
     * @param options Options for this method.
     * @return Device array after filtering and sorting.
     */
    private filterDevices(options?: {
        devices?: HidDevice[],
        filter?: (device: HidDevice) => boolean,
        sort?: (a: HidDevice, b: HidDevice) => number,
    }) {
        let { devices = this.hidDeviceList || [] } = options || {};

        if (options) {
            if (devices.length > 0 && options.filter) {
                devices = devices.filter(options.filter);
            }

            if (devices.length > 0 && options.sort) {
                devices = devices.sort(options.sort);
            }
        }
        return devices;
    }

    /**
     * Update device list.
     * @param delay Delay interval before updating.
     * @param types Types to be include in updated list.
     */
    private async updateDeviceList(delay: number, ...types: DeviceType[]) {
        const refresh = () => {
            this.hidDeviceList = hidDevices();
            this.refreshItemList(...types);
        };

        if (delay > 0) {
            setTimeout(refresh, delay);
        } else {
            refresh();
        }
    }

    /**
     * Refresh item list.
     * @param types Types to keep in refreshed list.
     */
    private async refreshItemList(...types: DeviceType[]) {
        const allDevices = this.filterDevices();
        let listChanged = false;

        const setDevices = (devices: HidDevice[], type: DeviceType) => {
            // Add device to list if not already exists
            for (const device of devices) {
                if (device.path) {
                    if (!this.itemList.has(device.path)) {
                        this.itemList.set(device.path, {
                            active: type !== "steam-dongle",
                            device: null,
                            info: device,
                            type,
                        });
                        listChanged = true;
                    }
                }
            }

            // Remove no longer present devices
            for (const [path, item] of this.itemList) {
                if (item.type === type) {
                    const hasDevice = devices.findIndex((device) => device.path === path) !== -1;
                    if (!hasDevice) {
                        if (item.device) {
                            item.device.close();
                        }
                        this.itemList.delete(path);
                        listChanged = true;
                    }
                }
            }

            return listChanged;
        };

        for (const type of types) {
            let devices: HidDevice[] | null = null;
            switch (type) {
                case "steam-dongle":
                    devices = this.filterDevices({
                        devices: allDevices,
                        filter: (device) => {
                            return device.productId === SteamHidId.DongleProduct &&
                                device.vendorId === SteamHidId.Vendor &&
                                device.interface > 0 && device.interface < 5;
                        },
                        sort: (a, b) => {
                            return a.interface > b.interface ? 1 : 0;
                        },
                    });
                    break;
                case "steam-wired":
                    devices = this.filterDevices({
                        devices: allDevices,
                        filter: (device) => {
                            return device.productId === SteamHidId.WiredProduct &&
                                device.vendorId === SteamHidId.Vendor &&
                                device.interface > 0 && device.interface < 5;
                        },
                        sort: (a, b) => {
                            return a.interface > b.interface ? 1 : 0;
                        },
                    });
                    break;
            }
            if (devices !== null) {
                setDevices(devices, type);
                if (type === "steam-dongle") {
                   await this.updateSteamDongleStatus();
                }
            }
        }

        if (listChanged) {
            listChangeSubject.next();
        }
    }

    private async updateSteamDongleStatus() {
        const wirelessStateCheck = new HidFeatureArray(0xB4).array;

        for (const [path, item] of this.itemList) {
            try {
                if (item.type === "steam-dongle") {
                    const device = (item.device !== null ? item.device.hidDevice : null) || new HID(path);
                    device!.sendFeatureReport(wirelessStateCheck);

                    const data = device!.getFeatureReport(wirelessStateCheck[0], wirelessStateCheck.length);
                    item.active = data![2] > 0 && data![3] === 2;
                }
                // tslint:disable-next-line:no-empty
            } catch (everything) { } // In case HID devices are disconnected
        }
    }



}