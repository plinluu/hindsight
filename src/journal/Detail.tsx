import Settings from './Settings'
import Briefing from './Briefing'
import Markets from "./Markets"
import {Products,Panel} from './Today'
const entries:Record<string,[string,string]>={Review:['Trade reflection','SPY · I entered after the opening rush. Next time I’ll write down my exit before buying.'],Learn:['What is an ETF?','An exchange-traded fund holds a basket of investments. Buying one share gives you a small piece of that basket.'],Settings:['Display preferences','Temperature in Celsius · System motion preference']}
export default function Detail({page}:{page:string}){if(page==="Settings")return <Settings/>;if(page==="Markets")return <Markets/>;const entry=entries[page];return <><div className="hero"><h1>{page}</h1></div>{page==='News'?<Briefing/>:page==='Tools'?<Products/>:entry?<Panel title={entry[0]}><p>{entry[1]}</p></Panel>:<a href="/">Return to Today</a>}</>}
