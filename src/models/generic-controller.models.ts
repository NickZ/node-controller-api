import { DualshockMeta, DualshockReport } from "./dualshock.models";
import { Observable } from "rxjs";
import { MotionDataWithTimestamp } from ".";
import { Device as HidDevice, devices as hidDevices, HID } from "node-hid";

/**
 * Abstract class wrapper for Steam devices.
 */
export abstract class GenericControllerDevice<R extends MotionDataWithTimestamp> {
    public hidDevice: HID | null=null;
    /**
     * Returns observable for new reports.
     */
    public abstract readonly onReport: Observable<R>;

    /**
     * Returns observable for new motion data.
     */
    public abstract readonly onMotionsData: Observable<MotionDataWithTimestamp>;

    /**
     * Returns observable for errors.
     */
    public abstract readonly onError: Observable<Error>;

    /**
     * Returns observable for open and close events.
     */
    public abstract readonly onOpenClose: Observable<boolean>;

    /**
     * Connects to available device.
     */
    public abstract open(): this;

    /**
     * Closes open connection to device.
     */
    public abstract close(): this;

    /**
     * Check if connection to steam device is open.
     * @returns `true` if connection is open.
     */
    public abstract isOpen(): boolean;

    /**
     * Converts device report to compatible Dualshock device report.
     * @param report Steam device report.
     * @param padId Id to use in new report.
     * @returns Converted report or `null` if conversion failed.
     */
    public abstract reportToDualshockMeta(report: R, padId: number): DualshockMeta | null;

    /**
     * Converts device report to compatible Dualshock device metadata.
     * @param report Steam device report.
     * @param padId Id to use in new report.
     * @returns Converted metadata or `null` if conversion failed.
     */
    public abstract reportToDualshockReport(report: R): DualshockReport | null;

    /**
     * Returns current report or `null` if there is none.
     */
    public abstract get report(): R | null;

    /**
     * Returns current motion data or `null` if there is none.
     */
    public abstract get motionData(): MotionDataWithTimestamp | null;
}
