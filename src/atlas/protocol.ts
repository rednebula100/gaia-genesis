// Host/renderer wire protocol. The standalone GPL renderer imports no GAIA engine code.
export const bodies=['earth','procedural','moon','mercury','venus','mars','jupiter'] as const;
export type Body=typeof bodies[number];
export const validBody=(s:string|null):Body=>bodies.includes(s as Body)?s as Body:'earth';
export const captions:Record<Body,string>={earth:'실제 지구 / NASA 기반 낮·밤·구름 지도',procedural:'가상 행성 / 시드 기반 FBM 지형·구름·위성',moon:'달 / 분화구와 현무암 평원 · SSS 지도',mercury:'수성 / 충돌 지형 · SSS 지도',venus:'금성 / 표면 지도와 예술적 대기 · SSS',mars:'화성 / 산화철 사막·극지 · SSS 지도',jupiter:'목성 / 구름 띠 지도 · SSS'};
export type Uniforms=Record<string,number|number[]>;
export type AtlasSnapshot={body:Body;ready:boolean;active:boolean;frames:number;time:number;quality:number;width:number;height:number;seed:number;uniforms:Uniforms;error?:string};
