import { MATCH_STATUS } from "../validations/matches.js";


/**
 * Determine a match's status based on its start and end times relative to a reference time.
 * @param {string|number|Date} startTime - Match start time (ISO string, timestamp, or Date).
 * @param {string|number|Date} endTime - Match end time (ISO string, timestamp, or Date).
 * @param {Date} [now=new Date()] - Reference time used to evaluate status.
 * @returns {('SCHEDULED'|'LIVE'|'FINISHED'|null)} One of `MATCH_STATUS.SCHEDULED`, `MATCH_STATUS.LIVE`, or `MATCH_STATUS.FINISHED`; returns `null` if `startTime` or `endTime` cannot be parsed as valid dates.
 */
export function getMatchStatus(startTime, endTime, now = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())){return null}

    if(now < start) {
        return MATCH_STATUS.SCHEDULED;
    }

    if(now >= end){
        return MATCH_STATUS.FINISHED
    }

    return MATCH_STATUS.LIVE
};

export async function syncMatchStatus(match, updateStatus){
    const nextStatus = getMatchStatus(match.startTime, match.endTime);
    if(!nextStatus){
        return match.status;
    }

    if(match.status !== nextStatus){
        await updateStatus(nextStatus);
        match.status = nextStatus;
    }

    return match.status;
}