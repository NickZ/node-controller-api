import { Subject } from "rxjs";
import { Filter, privateData } from "../lib";
import { MotionData, MotionDataWithTimestamp, TypedFilterData } from "../models";
import {
    DualshockData,
    DualshockMeta,
    DualshockReport,
    GenericControllerDevice,
} from "../models";

/**
 * Internal class data interface.
 */
interface InternalData {
    dualshockDataSubject: Subject<DualshockData>;
    errorSubject: Subject<Error>;
    motionDataSubject: Subject<MotionDataWithTimestamp>;
    openCloseSubject: Subject<boolean>;
    reportSubject: Subject<MotionDataWithTimestamp>;
}

/**
 * Private data getter.
 */
const getInternals = privateData() as (self: GenericController<MotionDataWithTimestamp>, init: InternalData | void) => InternalData;

/**
 * Class wrapper for handling various controllers as Dualshock compatible.
 */
export class GenericController<R extends MotionDataWithTimestamp>  extends GenericControllerDevice<R> {
    /**
     * Currently open device.
     */
    private device: GenericControllerDevice<R> | null = null;

    /**
     * Instance of filter.
     */
    private filter: Filter = new Filter();

    constructor(device: GenericControllerDevice<R> , private id: number) {
        super();
        const pd = getInternals(this, {
            dualshockDataSubject: new Subject(),
            errorSubject: new Subject(),
            motionDataSubject: new Subject(),
            openCloseSubject: new Subject(),
            reportSubject: new Subject(),
        });

        this.device = device;

        this.device!.onError.subscribe((value) => pd.errorSubject.next(value));
        this.device!.onMotionsData.subscribe((value) => pd.motionDataSubject.next(value));
        this.device!.onOpenClose.subscribe((value) => pd.openCloseSubject.next(value));
        this.device!.onReport.subscribe((value) => {
            const output = this.filter.setInput(value).filter(50000).getOutput();
            let meta: DualshockMeta | null;
            let report: DualshockReport | null;

            value = { ...value, ...output };
            pd.reportSubject.next(value);

            meta = this.device!.reportToDualshockMeta(value, this.id);
            report = this.device!.reportToDualshockReport(value);

            if (report !== null && meta !== null) {
                pd.dualshockDataSubject.next({ meta, report });
            }
        });
    }

    public get report() {
        return this.device!.isOpen() ? this.device!.report : null;
    }

    public get motionData() {
        return this.device!.isOpen() ? this.device!.motionData : null;
    }

    public get onDualshockData() {
        return getInternals(this).dualshockDataSubject.asObservable();
    }

    public get onReport() {
        return getInternals(this).reportSubject.asObservable();
    }

    public get onMotionsData() {
        return getInternals(this).motionDataSubject.asObservable();
    }

    public get onError() {
        return getInternals(this).errorSubject.asObservable();
    }

    public get onOpenClose() {
        return getInternals(this).openCloseSubject.asObservable();
    }

    public reportToDualshockReport(report: R) {
        return this.isOpen() ? this.device!.reportToDualshockReport(report) : null;
    }

    public reportToDualshockMeta(report: R, padId: number) {
        return this.isOpen() ? this.device!.reportToDualshockMeta(report, padId) : null;
    }

    public open() {
        this.device!.open();
        return this;
    }

    public isOpen() {
        return this.device!.isOpen();
    }

    public close() {
        this.device!.close();
        return this;
    }

    public setFilter(data: TypedFilterData) {
        this.filter.setFilter(data);
    }

    public get dualShockMeta() {
        return this.isOpen() ? this.device!.reportToDualshockMeta(this.device!.report!, this.id) : null;
    }

    public get dualShockReport() {
        return this.isOpen() ? this.device!.reportToDualshockReport(this.device!.report!) : null;
    }
}
