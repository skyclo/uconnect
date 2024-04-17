import { Link } from "@remix-run/react"

export default function EventCard({ eid, link, name, date_from, date_to, type, isPublic, eventTypes }) {
    return <Link to={link} key={eid} className="flex flex-col justify-between border border-gray-300 rounded-md px-4 py-3">
        <div className="flex flex-row justify-between">
            <div className="flex flex-col">
                <h3 className="text-gray-900">{name}</h3>
                <div className="text-gray-700 text-sm">
                    <p>
                        {new Date(date_from).toLocaleDateString("en-us", {
                            weekday: "long",
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        })}
                    </p>
                    <p>
                        {new Date(date_from).toLocaleTimeString("en-us", {
                            hour: "numeric",
                            minute: "numeric",
                            hour12: true
                        })}
                        {" "}&#8594;{" "}
                        {new Date(date_to).toLocaleTimeString("en-us", {
                            hour: "numeric",
                            minute: "numeric",
                            hour12: true
                        })}
                    </p>
                </div>
            </div>
            <div className="text-gray-700 text-sm text-right ml-4 flex flex-row mt-1 space-x-2 w-max h-min">
                <Pill>{eventTypes[type - 1].name}</Pill>
                {isPublic == true && <Pill>Public</Pill>}
                {isPublic == null && <Pill>RSO</Pill>}
            </div>
        </div>
    </Link>
}

export function Pill({className, children, ...props}) {
    return <div className={`uppercase text-2xs font-bold px-3 py-1.5 bg-orange-500 bg-opacity-50 text-orange-900 rounded-full text-center leading-none w-max h-min ${className}`} {...props}>
        {children}
    </div>
}
