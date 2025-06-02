import * as winston from 'winston';
import { LoggingContainer, ApplauseTransport, APPLAUSE_LOG_RECORDS } from '../src/shared/logging.ts';

describe('LoggingContainer', () => {
    let loggingContainer: LoggingContainer;

    beforeEach(() => {
        loggingContainer = new LoggingContainer();
    });

    it('should add logs', () => {
        loggingContainer.addLog('Log 1');
        loggingContainer.addLog('Log 2');

        expect(loggingContainer.getLogs()).toEqual(['Log 1', 'Log 2']);
    });

    it('should clear logs', () => {
        loggingContainer.addLog('Log 1');
        loggingContainer.addLog('Log 2');
        loggingContainer.clearLogs();

        expect(loggingContainer.getLogs()).toEqual([]);
    });
});

describe('ApplauseTransport', () => {
    let applauseTransport: ApplauseTransport;

    beforeEach(() => {
        applauseTransport = new ApplauseTransport();
    });

    afterEach(() => {
        APPLAUSE_LOG_RECORDS.clearLogs();
    });

    it('should log information', () => {
        const logs: string[] = [];

        applauseTransport.log({message: 'Log 1', level: 'info'}, () => {
            logs.push('Log 1');
        });

        applauseTransport.log({message: 'Log 2', level: 'info'}, () => {
            logs.push('Log 2');
        });

        expect(APPLAUSE_LOG_RECORDS.getLogs()).toEqual(logs);
    });
});

describe('ApplauseTransport - Formated', () => {
    let applauseTransport: ApplauseTransport;

    beforeEach(() => {
        applauseTransport = new ApplauseTransport({
            format: winston.format.printf((info) => 'Applause: ' + info.message),
        });
    });

    afterEach(() => {
        APPLAUSE_LOG_RECORDS.clearLogs();
    });

    it('should log information', () => {
        const logs: string[] = [];

        applauseTransport.log({message: 'Log 1', level: 'info'}, () => {
            logs.push('Applause: Log 1');
        });

        applauseTransport.log({message: 'Log 2', level: 'info'}, () => {
            logs.push('Applause: Log 2');
        });

        expect(APPLAUSE_LOG_RECORDS.getLogs()).toEqual(logs);
    });
});

describe('Winston Logger Using Applause Transport', () => {
    let logger: winston.Logger;

    beforeEach(() => {
        logger = winston.createLogger({
            level: 'info',
            format: winston.format.printf((info) => info.message as string),
            transports: [
                new ApplauseTransport(),
            ],
        });
    });

    afterEach(() => {
        APPLAUSE_LOG_RECORDS.clearLogs();
    });

    it('should log information', () => {
        logger.info('Log 1');
        logger.info('Log 2');

        expect(APPLAUSE_LOG_RECORDS.getLogs()).toEqual(['Log 1', 'Log 2']);
    });
})
describe('Winston Logger Using Applause Transport and format', () => {
    let logger: winston.Logger;

    beforeEach(() => {
        logger = winston.createLogger({
            level: 'info',
            format: winston.format.printf((info) => 'Applause ' + info.message),
            transports: [
                new ApplauseTransport(),
            ],
        });
    });

    afterEach(() => {
        APPLAUSE_LOG_RECORDS.clearLogs();
    });

    it('should log information', () => {
        logger.info('Log 1');
        logger.info('Log 2');

        expect(APPLAUSE_LOG_RECORDS.getLogs()).toEqual(['Applause Log 1', 'Applause Log 2']);
    });
})
