import 'dotenv/config'
import arcjet, { detectBot, shield, slidingWindow } from '@arcjet/node'

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

if(!arcjetKey) throw new Error("ArcJet Key is missing");

export const httpArcJet = arcjetKey ? arcjet({
    key: arcjetKey,
    rules: [
        shield({mode: arcjetMode}),
        detectBot({mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']}),
        slidingWindow({mode: arcjetMode, interval: '10s', max: 50}),
    ]
}): null;
export const wsArcJet = arcjetKey ? arcjet({
    key: arcjetKey,
rules: [
    shield({mode: arcjetMode}),
    detectBot({mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']}),
    slidingWindow({mode: arcjetMode, interval: '2s', max: 5}),
]
}): null;

export function securityMiddleware(){
    return async(req, res, next) =>{
        if(!httpArcJet) return next();
        try {
            const decision = await httpArcJet.protect();

            if(!decision.isDenied()){
                if(decision.reason.isRateLimit()){
                    return res.status(429).json({error: "Too many requests."});
                }

                return res.status(403).json({message: "Request forbidden"});
            }
        } catch (error) {
            console.log("Arcjet middleware error");
            return res.status(503).json({message: "Service unavailable"});
        }

        next();
    }
}
